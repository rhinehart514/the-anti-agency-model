import { NextRequest, NextResponse } from 'next/server';
import { stripe, constructWebhookEvent } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { sendOrderConfirmation, sendPaymentFailedEmail } from '@/lib/email/send';
import { loggers } from '@/lib/logger';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature, webhookSecret);
  } catch (err: any) {
    loggers.stripe.error({ error: err.message }, 'Webhook signature verification failed');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      // Payment Intent Events
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(supabase, paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(supabase, paymentIntent);
        break;
      }

      // Charge Events
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(supabase, charge);
        break;
      }

      // Checkout Session Events
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      // Subscription Events
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(supabase, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(supabase, invoice);
        break;
      }

      default:
        loggers.stripe.debug({ eventType: event.type }, 'Unhandled event type');
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    loggers.stripe.error({ error }, 'Webhook handler error');
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Handler Functions

async function handlePaymentSucceeded(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent
) {
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) {
    loggers.stripe.warn({ paymentIntentId: paymentIntent.id }, 'No order_id in payment intent metadata');
    return;
  }

  // Update order status
  await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  // Create payment record
  await supabase.from('payments').insert({
    order_id: orderId,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'succeeded',
    provider: 'stripe',
    provider_payment_id: paymentIntent.id,
    provider_data: {
      payment_method: paymentIntent.payment_method,
      receipt_email: paymentIntent.receipt_email,
    },
  });

  // Send order confirmation email
  const { data: fullOrder } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        quantity,
        unit_price,
        product_snapshot
      )
    `)
    .eq('id', orderId)
    .single();

  if (fullOrder?.email) {
    sendOrderConfirmation(fullOrder.email, {
      orderNumber: fullOrder.order_number,
      customerName: fullOrder.shipping_address?.firstName || 'Customer',
      items: fullOrder.order_items?.map((item: any) => ({
        name: item.product_snapshot?.name || 'Product',
        quantity: item.quantity,
        price: item.unit_price,
      })) || [],
      subtotal: fullOrder.subtotal,
      shipping: fullOrder.shipping_cost || 0,
      discount: fullOrder.discount_amount || 0,
      tax: fullOrder.tax_amount || 0,
      total: fullOrder.total,
      shippingAddress: {
        name: `${fullOrder.shipping_address?.firstName} ${fullOrder.shipping_address?.lastName}`,
        address1: fullOrder.shipping_address?.address1,
        address2: fullOrder.shipping_address?.address2,
        city: fullOrder.shipping_address?.city,
        state: fullOrder.shipping_address?.state,
        postalCode: fullOrder.shipping_address?.postalCode,
        country: fullOrder.shipping_address?.country,
      },
    }).catch((err) => loggers.stripe.error({ error: err, orderId }, 'Order confirmation email error'));
  }

  loggers.stripe.info({ orderId, paymentIntentId: paymentIntent.id }, 'Payment succeeded');
}

async function handlePaymentFailed(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent
) {
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) return;

  // Get order details for the email
  const { data: order } = await supabase
    .from('orders')
    .select('email, order_number, shipping_address, total')
    .eq('id', orderId)
    .single();

  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  // Create failed payment record
  await supabase.from('payments').insert({
    order_id: orderId,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'failed',
    provider: 'stripe',
    provider_payment_id: paymentIntent.id,
    provider_data: {
      error: paymentIntent.last_payment_error?.message,
    },
  });

  // Send payment failed email
  if (order?.email) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await sendPaymentFailedEmail(order.email, {
        customerName: order.shipping_address?.firstName || 'Customer',
        orderNumber: order.order_number,
        amount: order.total,
        currency: paymentIntent.currency?.toUpperCase() || 'USD',
        reason: paymentIntent.last_payment_error?.message || 'Payment was declined',
        retryUrl: `${appUrl}/checkout/${orderId}/payment`,
      });
    } catch (emailError) {
      loggers.stripe.error({ error: emailError, orderId }, 'Failed to send payment failed email');
    }
  }

  loggers.stripe.warn({ orderId, paymentIntentId: paymentIntent.id, reason: paymentIntent.last_payment_error?.message }, 'Payment failed');
}

async function handleChargeRefunded(supabase: any, charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;

  // Find the payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('id, order_id')
    .eq('provider_payment_id', paymentIntentId)
    .single();

  if (!payment) return;

  const refundedAmount = charge.amount_refunded / 100;
  const isFullRefund = charge.refunded;

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      refunded_amount: refundedAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  // Update order status
  await supabase
    .from('orders')
    .update({
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
      refund_amount: refundedAmount,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.order_id);

  loggers.stripe.info({ orderId: payment.order_id, refundedAmount, isFullRefund }, 'Refund processed');
}

async function handleCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  const orderId = session.metadata?.order_id;

  if (!orderId) return;

  if (session.payment_status === 'paid') {
    await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }

  loggers.stripe.info({ orderId, sessionId: session.id, paymentStatus: session.payment_status }, 'Checkout completed');
}

async function handleSubscriptionUpdated(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const orgId = subscription.metadata?.organization_id;

  if (!orgId) return;

  const status = subscription.status;
  const planId = subscription.items.data[0]?.price.id;

  // Map Stripe price IDs to plan names
  const planMap: Record<string, string> = {
    [process.env.STRIPE_STARTER_PRICE_ID || '']: 'starter',
    [process.env.STRIPE_PRO_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_AGENCY_PRICE_ID || '']: 'agency',
    [process.env.STRIPE_ENTERPRISE_PRICE_ID || '']: 'enterprise',
  };

  const plan = planMap[planId] || 'starter';

  await supabase
    .from('organization_billing')
    .update({
      stripe_subscription_id: subscription.id,
      plan,
      status: status === 'active' ? 'active' : status === 'trialing' ? 'trialing' : 'past_due',
      current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', orgId);

  loggers.stripe.info({ organizationId: orgId, plan, status, subscriptionId: subscription.id }, 'Subscription updated');
}

async function handleSubscriptionCancelled(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const orgId = subscription.metadata?.organization_id;

  if (!orgId) return;

  await supabase
    .from('organization_billing')
    .update({
      status: 'cancelled',
      plan: 'free',
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', orgId);

  loggers.stripe.info({ organizationId: orgId, subscriptionId: subscription.id }, 'Subscription cancelled');
}

async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.parent?.subscription_details?.subscription;

  if (!subscriptionId || typeof subscriptionId !== 'string') return;

  // Update billing record to confirm payment
  await supabase
    .from('organization_billing')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  loggers.stripe.info({ subscriptionId, invoiceId: invoice.id }, 'Invoice paid');
}

async function handleInvoiceFailed(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.parent?.subscription_details?.subscription;

  if (!subscriptionId || typeof subscriptionId !== 'string') return;

  await supabase
    .from('organization_billing')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  // Send payment failed email
  try {
    const customer = await stripe.customers.retrieve(invoice.customer as string);
    if (customer && !customer.deleted && customer.email) {
      await sendPaymentFailedEmail(customer.email, {
        customerName: customer.name || 'Customer',
        amount: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        reason: 'Payment could not be processed',
      });
      loggers.stripe.info({ email: customer.email, invoiceId: invoice.id }, 'Payment failed email sent');
    }
  } catch (emailError) {
    loggers.stripe.error({ error: emailError, invoiceId: invoice.id }, 'Failed to send payment failed email');
  }

  loggers.stripe.warn({ subscriptionId, invoiceId: invoice.id }, 'Invoice payment failed');
}
