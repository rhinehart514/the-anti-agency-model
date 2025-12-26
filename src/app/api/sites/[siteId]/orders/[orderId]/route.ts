import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRefund } from '@/lib/stripe/client';

// GET /api/sites/[siteId]/orders/[orderId] - Get a single order
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; orderId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (id, name, images, slug),
          product_variants (id, name, options)
        ),
        customers (*)
      `)
      .eq('id', params.orderId)
      .eq('site_id', params.siteId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/sites/[siteId]/orders/[orderId] - Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string; orderId: string } }
) {
  try {
    const body = await request.json();
    const {
      status,
      paymentStatus,
      fulfillmentStatus,
      trackingNumber,
      trackingUrl,
      notes,
      metadata,
    } = body;

    const supabase = await createClient();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (paymentStatus) updateData.payment_status = paymentStatus;
    if (fulfillmentStatus) updateData.fulfillment_status = fulfillmentStatus;
    if (trackingNumber) updateData.tracking_number = trackingNumber;
    if (trackingUrl) updateData.tracking_url = trackingUrl;
    if (notes !== undefined) updateData.notes = notes;
    if (metadata) updateData.metadata = metadata;

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', params.orderId)
      .eq('site_id', params.siteId)
      .select(`
        *,
        order_items (
          *,
          products (id, name, images)
        ),
        customers (id, email, name)
      `)
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// POST /api/sites/[siteId]/orders/[orderId]/refund - Process refund
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; orderId: string } }
) {
  try {
    const body = await request.json();
    const { amount, reason, restockItems } = body;

    const supabase = await createClient();

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.orderId)
      .eq('site_id', params.siteId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const refundAmount = amount || order.total;

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'refunded',
        payment_status: 'refunded',
        refund_amount: refundAmount,
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error processing refund:', updateError);
      return NextResponse.json(
        { error: 'Failed to process refund' },
        { status: 500 }
      );
    }

    // Restock items if requested
    if (restockItems) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, variant_id, quantity')
        .eq('order_id', params.orderId);

      if (orderItems) {
        for (const item of orderItems) {
          if (item.variant_id) {
            await supabase.rpc('increment_variant_quantity', {
              p_variant_id: item.variant_id,
              p_quantity: item.quantity,
            });
          } else {
            await supabase.rpc('increment_product_quantity', {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
            });
          }
        }
      }
    }

    // Process refund through Stripe if payment was made via Stripe
    let stripeRefund = null;
    const stripePaymentIntentId = order.metadata?.stripe_payment_intent_id;

    if (stripePaymentIntentId && process.env.STRIPE_SECRET_KEY) {
      try {
        stripeRefund = await createRefund({
          paymentIntentId: stripePaymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: reason === 'duplicate' || reason === 'fraudulent' || reason === 'requested_by_customer'
            ? reason
            : 'requested_by_customer',
        });

        // Update order with Stripe refund ID
        await supabase
          .from('orders')
          .update({
            metadata: {
              ...order.metadata,
              stripe_refund_id: stripeRefund.id,
            },
          })
          .eq('id', params.orderId);
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError);
        return NextResponse.json(
          { error: `Refund failed: ${stripeError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      order: updatedOrder,
      refundAmount,
      stripeRefundId: stripeRefund?.id,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
