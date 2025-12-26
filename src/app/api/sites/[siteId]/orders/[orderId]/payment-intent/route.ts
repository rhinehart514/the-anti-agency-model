import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';

// GET /api/sites/[siteId]/orders/[orderId]/payment-intent - Get payment intent client secret
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; orderId: string } }
) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Get order with payment intent ID
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, metadata, payment_status, total')
      .eq('id', params.orderId)
      .eq('site_id', params.siteId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // If already paid, don't return client secret
    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      );
    }

    const paymentIntentId = order.metadata?.stripe_payment_intent_id;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'No payment intent found for this order' },
        { status: 404 }
      );
    }

    // Retrieve payment intent from Stripe to get client secret
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.client_secret) {
      return NextResponse.json(
        { error: 'Unable to retrieve payment details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment details' },
      { status: 500 }
    );
  }
}
