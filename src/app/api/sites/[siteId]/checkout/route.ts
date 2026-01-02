import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { createPaymentIntent, getOrCreateCustomer } from '@/lib/stripe/client';
import { withRateLimit, rateLimiters } from '@/lib/rate-limit';
import { calculateOrderTax } from '@/lib/taxjar/calculate';
import { z } from 'zod';
import { loggers } from '@/lib/logger';

const CART_COOKIE_NAME = 'cart_id';

// Zod schemas for checkout validation
const AddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  address1: z.string().min(1, 'Address is required').max(200),
  address2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().min(2, 'Country is required').max(100),
  phone: z.string().max(30).optional(),
});

const CheckoutRequestSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
  useSameAddress: z.boolean().default(true),
  shippingMethodId: z.string().uuid().optional(),
  paymentMethodId: z.string().optional(),
  siteUserId: z.string().uuid().optional(),
  discountCode: z.string().max(50).optional(),
});

// POST /api/sites/[siteId]/checkout - Create checkout session
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  // Rate limit: 10 checkout attempts per minute
  const rateLimit = withRateLimit(request, rateLimiters.checkout);
  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  try {
    const body = await request.json();

    // Validate request body with Zod
    const parseResult = CheckoutRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    const {
      email,
      shippingAddress,
      billingAddress,
      useSameAddress,
      shippingMethodId,
      paymentMethodId,
      siteUserId,
      discountCode,
    } = parseResult.data;

    const cookieStore = await cookies();
    const cartId = cookieStore.get(`${CART_COOKIE_NAME}_${params.siteId}`)?.value;

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get cart with items
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select(`
        *,
        cart_items (
          *,
          products (id, name, price, track_inventory, quantity, images),
          product_variants (id, name, price, quantity, options, image_url)
        )
      `)
      .eq('cart_token', cartId)
      .eq('site_id', params.siteId)
      .single();

    if (cartError || !cart || !cart.cart_items?.length) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Validate inventory and calculate totals
    let subtotal = 0;
    const orderItems: any[] = [];
    const inventoryErrors: string[] = [];

    for (const item of cart.cart_items) {
      const product = item.products;
      const variant = item.product_variants;
      const price = variant?.price || product?.price || 0;
      const availableQuantity = variant?.quantity ?? product?.quantity ?? 999;

      if (product?.track_inventory && availableQuantity < item.quantity) {
        inventoryErrors.push(
          `${product.name}${variant ? ` - ${variant.name}` : ''}: Only ${availableQuantity} available`
        );
      }

      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: product?.id,
        variant_id: variant?.id,
        quantity: item.quantity,
        unit_price: price,
        total_price: itemTotal,
        product_snapshot: {
          name: product?.name,
          price,
          image: variant?.image_url || product?.images?.[0],
          options: variant?.options,
        },
      });
    }

    if (inventoryErrors.length > 0) {
      return NextResponse.json(
        { error: 'Some items are out of stock', details: inventoryErrors },
        { status: 400 }
      );
    }

    // Get shipping method
    let shippingCost = 0;
    let shippingMethod = null;

    if (shippingMethodId) {
      const { data: method } = await supabase
        .from('shipping_methods')
        .select('*')
        .eq('id', shippingMethodId)
        .eq('site_id', params.siteId)
        .single();

      if (method) {
        shippingMethod = method;
        shippingCost = method.price;
      }
    }

    // Apply discount code
    let discountAmount = 0;
    let appliedDiscount = null;

    if (discountCode) {
      const { data: discount } = await supabase
        .from('discounts')
        .select('*')
        .eq('code', discountCode.toUpperCase())
        .eq('site_id', params.siteId)
        .eq('is_active', true)
        .single();

      if (discount) {
        const now = new Date();
        const startsAt = discount.starts_at ? new Date(discount.starts_at) : null;
        const endsAt = discount.ends_at ? new Date(discount.ends_at) : null;

        if ((!startsAt || now >= startsAt) && (!endsAt || now <= endsAt)) {
          if (!discount.max_uses || discount.use_count < discount.max_uses) {
            if (!discount.min_order_value || subtotal >= discount.min_order_value) {
              appliedDiscount = discount;

              if (discount.type === 'percentage') {
                discountAmount = subtotal * (discount.value / 100);
                if (discount.max_discount_value) {
                  discountAmount = Math.min(discountAmount, discount.max_discount_value);
                }
              } else if (discount.type === 'fixed') {
                discountAmount = Math.min(discount.value, subtotal);
              } else if (discount.type === 'free_shipping') {
                discountAmount = shippingCost;
              }
            }
          }
        }
      }
    }

    // Calculate tax using TaxJar
    const taxResult = await calculateOrderTax({
      toAddress: {
        address1: shippingAddress.address1,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
      },
      items: orderItems.map((item) => ({
        id: item.product_id || 'unknown',
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
      shippingCost,
      discountAmount,
    });

    const taxAmount = taxResult.taxAmount;
    const total = subtotal + shippingCost + taxAmount - discountAmount;

    // Get or create customer
    let customerId = null;

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('site_id', params.siteId)
      .eq('email', email.toLowerCase())
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          site_id: params.siteId,
          email: email.toLowerCase(),
          name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          site_user_id: siteUserId,
        })
        .select()
        .single();

      customerId = newCustomer?.id;
    }

    // Generate order number
    const orderNumber = `ORD-${nanoid(10).toUpperCase()}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        site_id: params.siteId,
        customer_id: customerId,
        site_user_id: siteUserId,
        order_number: orderNumber,
        email: email.toLowerCase(),
        status: 'pending',
        payment_status: 'pending',
        subtotal,
        discount_amount: discountAmount,
        discount_code: appliedDiscount?.code,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        total,
        shipping_address: shippingAddress,
        billing_address: useSameAddress ? shippingAddress : billingAddress,
        shipping_method: shippingMethod?.name,
        currency: 'USD',
      })
      .select()
      .single();

    if (orderError) {
      loggers.commerce.error({ siteId: params.siteId, error: orderError }, 'Error creating order');
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create order items
    const itemsToInsert = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    await supabase.from('order_items').insert(itemsToInsert);

    // Update discount usage
    if (appliedDiscount) {
      await supabase
        .from('discounts')
        .update({ use_count: (appliedDiscount.use_count || 0) + 1 })
        .eq('id', appliedDiscount.id);
    }

    // Clear cart
    await supabase.from('cart_items').delete().eq('cart_id', cart.id);

    // Create Stripe payment intent
    let paymentIntentClientSecret: string | null = null;

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        // Get or create Stripe customer
        const stripeCustomer = await getOrCreateCustomer(email.toLowerCase(), {
          site_id: params.siteId,
          customer_id: customerId || '',
        });

        // Create payment intent
        const paymentIntent = await createPaymentIntent({
          amount: Math.round(total * 100), // Convert to cents
          currency: 'usd',
          customerId: stripeCustomer.id,
          metadata: {
            order_id: order.id,
            order_number: orderNumber,
            site_id: params.siteId,
          },
          receiptEmail: email.toLowerCase(),
        });

        paymentIntentClientSecret = paymentIntent.client_secret;

        // Store payment intent ID in order metadata
        await supabase
          .from('orders')
          .update({
            metadata: {
              stripe_payment_intent_id: paymentIntent.id,
              stripe_customer_id: stripeCustomer.id,
            },
          })
          .eq('id', order.id);
      } catch (stripeError) {
        loggers.commerce.error({ siteId: params.siteId, orderId: order.id, error: stripeError }, 'Stripe payment intent creation failed');
        // Continue without Stripe - order is created but payment will fail
      }
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        subtotal,
        discountAmount,
        taxAmount,
        shippingCost,
        total,
        items: orderItems,
      },
      paymentIntentClientSecret,
      checkoutUrl: `/checkout/${order.id}/payment`,
    });
  } catch (error) {
    loggers.commerce.error({ siteId: params.siteId, error }, 'Checkout error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
