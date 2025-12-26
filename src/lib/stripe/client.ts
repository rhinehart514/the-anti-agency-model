import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Helper to get or create a Stripe customer
export async function getOrCreateCustomer(
  email: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return stripe.customers.create({
    email,
    metadata,
  });
}

// Create a payment intent for an order
export async function createPaymentIntent(params: {
  amount: number; // in cents
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  receiptEmail?: string;
}): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency || 'usd',
    customer: params.customerId,
    metadata: params.metadata,
    receipt_email: params.receiptEmail,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

// Create a checkout session for hosted checkout
export async function createCheckoutSession(params: {
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  mode?: 'payment' | 'subscription';
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    mode: params.mode || 'payment',
    line_items: params.lineItems,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    metadata: params.metadata,
  });
}

// Process a refund
export async function createRefund(params: {
  paymentIntentId: string;
  amount?: number; // in cents, if partial refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: params.paymentIntentId,
    amount: params.amount,
    reason: params.reason,
  });
}

// Create a subscription
export async function createSubscription(params: {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Subscription> {
  return stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: params.priceId }],
    trial_period_days: params.trialPeriodDays,
    metadata: params.metadata,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}

// Cancel a subscription
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Get subscription
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Webhook signature verification
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
