import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

// GET /api/sites/[siteId]/orders - List all orders
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();
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
      console.error('Error fetching orders:', error);
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
    console.error('Orders error:', error);
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

    const supabase = await createClient();

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
      console.error('Error creating order:', orderError);
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
      console.error('Error creating order items:', itemsError);
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
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
