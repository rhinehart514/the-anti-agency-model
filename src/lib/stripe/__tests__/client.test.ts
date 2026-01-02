import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up env before any imports
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_key');

// Create mock functions
const mockCustomersList = vi.fn();
const mockCustomersCreate = vi.fn();
const mockPaymentIntentsCreate = vi.fn();
const mockCheckoutSessionsCreate = vi.fn();
const mockRefundsCreate = vi.fn();
const mockSubscriptionsCreate = vi.fn();
const mockSubscriptionsCancel = vi.fn();
const mockSubscriptionsUpdate = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

// Mock Stripe constructor
vi.mock('stripe', () => ({
  default: class MockStripe {
    customers = {
      list: mockCustomersList,
      create: mockCustomersCreate,
    };
    paymentIntents = {
      create: mockPaymentIntentsCreate,
    };
    checkout = {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    };
    refunds = {
      create: mockRefundsCreate,
    };
    subscriptions = {
      create: mockSubscriptionsCreate,
      cancel: mockSubscriptionsCancel,
      update: mockSubscriptionsUpdate,
      retrieve: mockSubscriptionsRetrieve,
    };
    webhooks = {
      constructEvent: mockWebhooksConstructEvent,
    };
  },
}));

// Dynamic import after mocks
const importClient = async () => {
  // Reset module cache
  vi.resetModules();
  return import('../client');
};

describe('Stripe Client', () => {
  let client: Awaited<ReturnType<typeof importClient>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    client = await importClient();
  });

  describe('getOrCreateCustomer', () => {
    it('returns existing customer if found', async () => {
      const existingCustomer = {
        id: 'cus_existing123',
        email: 'existing@example.com',
        object: 'customer',
      };

      mockCustomersList.mockResolvedValue({
        data: [existingCustomer],
      });

      const result = await client.getOrCreateCustomer('existing@example.com');

      expect(mockCustomersList).toHaveBeenCalledWith({
        email: 'existing@example.com',
        limit: 1,
      });
      expect(mockCustomersCreate).not.toHaveBeenCalled();
      expect(result).toEqual(existingCustomer);
    });

    it('creates new customer if not found', async () => {
      const newCustomer = {
        id: 'cus_new123',
        email: 'new@example.com',
        object: 'customer',
      };

      mockCustomersList.mockResolvedValue({
        data: [],
      });
      mockCustomersCreate.mockResolvedValue(newCustomer);

      const result = await client.getOrCreateCustomer('new@example.com');

      expect(mockCustomersList).toHaveBeenCalledWith({
        email: 'new@example.com',
        limit: 1,
      });
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: 'new@example.com',
        metadata: undefined,
      });
      expect(result).toEqual(newCustomer);
    });

    it('passes metadata when creating new customer', async () => {
      mockCustomersList.mockResolvedValue({ data: [] });
      mockCustomersCreate.mockResolvedValue({
        id: 'cus_new123',
        email: 'new@example.com',
        metadata: { site_id: 'site_123' },
      });

      const metadata = { site_id: 'site_123', customer_id: 'cust_abc' };
      await client.getOrCreateCustomer('new@example.com', metadata);

      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: 'new@example.com',
        metadata,
      });
    });
  });

  describe('createPaymentIntent', () => {
    it('creates payment intent with required params', async () => {
      const paymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        amount: 5000,
        currency: 'usd',
      };

      mockPaymentIntentsCreate.mockResolvedValue(paymentIntent);

      const result = await client.createPaymentIntent({
        amount: 5000,
      });

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        customer: undefined,
        metadata: undefined,
        receipt_email: undefined,
        automatic_payment_methods: { enabled: true },
      });
      expect(result).toEqual(paymentIntent);
    });

    it('creates payment intent with all params', async () => {
      const paymentIntent = {
        id: 'pi_test456',
        client_secret: 'pi_test456_secret',
        amount: 10000,
        currency: 'eur',
      };

      mockPaymentIntentsCreate.mockResolvedValue(paymentIntent);

      const result = await client.createPaymentIntent({
        amount: 10000,
        currency: 'eur',
        customerId: 'cus_123',
        metadata: { order_id: 'order_abc' },
        receiptEmail: 'customer@example.com',
      });

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 10000,
        currency: 'eur',
        customer: 'cus_123',
        metadata: { order_id: 'order_abc' },
        receipt_email: 'customer@example.com',
        automatic_payment_methods: { enabled: true },
      });
      expect(result).toEqual(paymentIntent);
    });
  });

  describe('createCheckoutSession', () => {
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Test Product' },
          unit_amount: 2500,
        },
        quantity: 2,
      },
    ];

    it('creates checkout session with required params', async () => {
      const session = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123',
      };

      mockCheckoutSessionsCreate.mockResolvedValue(session);

      const result = await client.createCheckoutSession({
        lineItems,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith({
        mode: 'payment',
        line_items: lineItems,
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        customer: undefined,
        customer_email: undefined,
        metadata: undefined,
      });
      expect(result).toEqual(session);
    });

    it('creates subscription checkout session', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_sub_test',
        mode: 'subscription',
      });

      await client.createCheckoutSession({
        lineItems,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        mode: 'subscription',
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'subscription' })
      );
    });

    it('uses customerId when provided', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test' });

      await client.createCheckoutSession({
        lineItems,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customerId: 'cus_123',
        customerEmail: 'should@ignored.com',
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          customer_email: undefined,
        })
      );
    });
  });

  describe('createRefund', () => {
    it('creates full refund', async () => {
      const refund = {
        id: 're_test123',
        payment_intent: 'pi_test123',
        amount: 5000,
        status: 'succeeded',
      };

      mockRefundsCreate.mockResolvedValue(refund);

      const result = await client.createRefund({
        paymentIntentId: 'pi_test123',
      });

      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: undefined,
        reason: undefined,
      });
      expect(result).toEqual(refund);
    });

    it('creates partial refund with reason', async () => {
      const refund = {
        id: 're_test456',
        payment_intent: 'pi_test123',
        amount: 2500,
        status: 'succeeded',
      };

      mockRefundsCreate.mockResolvedValue(refund);

      const result = await client.createRefund({
        paymentIntentId: 'pi_test123',
        amount: 2500,
        reason: 'requested_by_customer',
      });

      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: 2500,
        reason: 'requested_by_customer',
      });
      expect(result).toEqual(refund);
    });
  });

  describe('createSubscription', () => {
    it('creates subscription with required params', async () => {
      const subscription = {
        id: 'sub_test123',
        status: 'active',
        customer: 'cus_123',
      };

      mockSubscriptionsCreate.mockResolvedValue(subscription);

      const result = await client.createSubscription({
        customerId: 'cus_123',
        priceId: 'price_abc',
      });

      expect(mockSubscriptionsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_abc' }],
        trial_period_days: undefined,
        metadata: undefined,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      expect(result).toEqual(subscription);
    });

    it('creates subscription with trial period', async () => {
      mockSubscriptionsCreate.mockResolvedValue({
        id: 'sub_trial',
        status: 'trialing',
      });

      await client.createSubscription({
        customerId: 'cus_123',
        priceId: 'price_abc',
        trialPeriodDays: 14,
        metadata: { org_id: 'org_xyz' },
      });

      expect(mockSubscriptionsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_abc' }],
        trial_period_days: 14,
        metadata: { org_id: 'org_xyz' },
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
    });
  });

  describe('cancelSubscription', () => {
    it('cancels subscription at period end by default', async () => {
      const subscription = {
        id: 'sub_test123',
        cancel_at_period_end: true,
      };

      mockSubscriptionsUpdate.mockResolvedValue(subscription);

      const result = await client.cancelSubscription('sub_test123');

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      });
      expect(mockSubscriptionsCancel).not.toHaveBeenCalled();
      expect(result).toEqual(subscription);
    });

    it('cancels subscription immediately when specified', async () => {
      const subscription = {
        id: 'sub_test123',
        status: 'canceled',
      };

      mockSubscriptionsCancel.mockResolvedValue(subscription);

      const result = await client.cancelSubscription('sub_test123', true);

      expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_test123');
      expect(mockSubscriptionsUpdate).not.toHaveBeenCalled();
      expect(result).toEqual(subscription);
    });
  });

  describe('getSubscription', () => {
    it('retrieves subscription by id', async () => {
      const subscription = {
        id: 'sub_test123',
        status: 'active',
        current_period_end: 1735689600,
      };

      mockSubscriptionsRetrieve.mockResolvedValue(subscription);

      const result = await client.getSubscription('sub_test123');

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_test123');
      expect(result).toEqual(subscription);
    });
  });

  describe('constructWebhookEvent', () => {
    it('constructs webhook event from payload and signature', () => {
      const event = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test123' } },
      };

      mockWebhooksConstructEvent.mockReturnValue(event);

      const result = client.constructWebhookEvent(
        '{"id":"evt_test123"}',
        'sig_test123',
        'whsec_test'
      );

      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        '{"id":"evt_test123"}',
        'sig_test123',
        'whsec_test'
      );
      expect(result).toEqual(event);
    });

    it('accepts Buffer payload', () => {
      const event = { id: 'evt_test123', type: 'charge.refunded' };
      const payload = Buffer.from('{"id":"evt_test123"}');

      mockWebhooksConstructEvent.mockReturnValue(event);

      client.constructWebhookEvent(payload, 'sig_test123', 'whsec_test');

      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        payload,
        'sig_test123',
        'whsec_test'
      );
    });
  });

  describe('Error handling', () => {
    it('propagates Stripe API errors', async () => {
      const stripeError = new Error('Card declined');
      mockPaymentIntentsCreate.mockRejectedValue(stripeError);

      await expect(
        client.createPaymentIntent({ amount: 5000 })
      ).rejects.toThrow('Card declined');
    });

    it('handles rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockCustomersList.mockRejectedValue(rateLimitError);

      await expect(
        client.getOrCreateCustomer('test@example.com')
      ).rejects.toThrow('Rate limit exceeded');
    });
  });
});
