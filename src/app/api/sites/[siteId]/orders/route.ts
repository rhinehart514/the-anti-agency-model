import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import { requireSiteOwnership } from '@/lib/api-security';
import { loggers } from '@/lib/logger';

// GET /api/sites/[siteId]/orders - List all orders
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Require site ownership
    await requireSiteOwnership(supabase, params.siteId);

    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const customerId = searchParams.get('customerId');

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (id, name, images)
        ),
        customers (id, email, name)
      `, { count: 'exact' })
      .eq('site_id', params.siteId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: orders, count, error } = await query;

    if (error) {
      loggers.commerce.error({ error }, 'Error fetching orders');
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orders,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    loggers.commerce.error({ error }, 'Orders error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/orders - Create a new order
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Require site ownership
    await requireSiteOwnership(supabase, params.siteId);

    const body = await request.json();
    const {
      customerId,
      items,
      shippingAddress,
      billingAddress,
      shippingMethod,
      shippingCost,
      discountCode,
      discountAmount,
      taxAmount,
      notes,
      metadata,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order items are required' },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = `ORD-${nanoid(10).toUpperCase()}`;

    // Calculate totals
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, images')
        .eq('id', item.productId)
        .eq('site_id', params.siteId)
        .single();

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: product.id,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: itemTotal,
        product_snapshot: {
          name: product.name,
          price: product.price,
          image: product.images?.[0],
        },
      });
    }

    const total = subtotal + (shippingCost || 0) + (taxAmount || 0) - (discountAmount || 0);

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        site_id: params.siteId,
        customer_id: customerId,
        order_number: orderNumber,
        status: 'pending',
        payment_status: 'pending',
        subtotal,
        discount_amount: discountAmount || 0,
        discount_code: discountCode,
        tax_amount: taxAmount || 0,
        shipping_cost: shippingCost || 0,
        total,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        shipping_method: shippingMethod,
        notes,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (orderError) {
      loggers.commerce.error({ error: orderError }, 'Error creating order');
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

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      loggers.commerce.error({ error: itemsError }, 'Error creating order items');
    }

    // Fetch complete order
    const { data: completeOrder } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (id, name, images)
        ),
        customers (id, email, name)
      `)
      .eq('id', order.id)
      .single();

    return NextResponse.json({ order: completeOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    loggers.commerce.error({ error }, 'Create order error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
