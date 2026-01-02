import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import type Stripe from 'stripe';

// Mock environment variables
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_secret');
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_key');
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  data: null as any,
  error: null as any,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock Stripe client
const mockConstructEvent = vi.fn();
vi.mock('@/lib/stripe/client', () => ({
  stripe: {},
  constructWebhookEvent: (...args: any[]) => mockConstructEvent(...args),
}));

// Mock email functions - must return Promises since code uses .catch()
const mockSendOrderConfirmation = vi.fn().mockResolvedValue({ success: true });
const mockSendPaymentFailedEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/lib/email/send', () => ({
  sendOrderConfirmation: (...args: any[]) => mockSendOrderConfirmation(...args),
  sendPaymentFailedEmail: (...args: any[]) => mockSendPaymentFailedEmail(...args),
}));

// Import after mocks are set up
const { POST } = await import('../route');

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.data = null;
    mockSupabase.error = null;
    // Restore Promise return values after clearAllMocks
    mockSendOrderConfirmation.mockResolvedValue({ success: true });
    mockSendPaymentFailedEmail.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function createRequest(body: string, signature: string = 'valid_signature'): NextRequest {
    return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body,
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json',
      },
    });
  }

  function createPaymentIntentEvent(status: 'succeeded' | 'failed', orderId: string): Stripe.Event {
    return {
      id: 'evt_test123',
      type: status === 'succeeded' ? 'payment_intent.succeeded' : 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_test123',
          amount: 5000,
          currency: 'usd',
          metadata: { order_id: orderId },
          payment_method: 'pm_test123',
          receipt_email: 'customer@test.com',
          last_payment_error: status === 'failed' ? { message: 'Card declined' } : undefined,
        } as Stripe.PaymentIntent,
      },
      object: 'event',
      api_version: '2025-12-15.clover',
      created: Date.now() / 1000,
      livemode: false,
      pending_webhooks: 0,
      request: { id: 'req_test', idempotency_key: null },
    };
  }

  describe('Request validation', () => {
    it('returns 400 if stripe-signature header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: '{}',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing stripe-signature header');
    });

    it('returns 400 if webhook signature is invalid', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

      const request = createRequest('{}', 'invalid_signature');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid signature');
    });
  });

  describe('payment_intent.succeeded', () => {
    it('updates order status and creates payment record', async () => {
      const orderId = 'order_123';
      const event = createPaymentIntentEvent('succeeded', orderId);

      mockConstructEvent.mockReturnValue(event);
      mockSupabase.data = {
        id: orderId,
        order_number: 'ORD-001',
        email: 'customer@test.com',
        subtotal: 45.00,
        shipping_cost: 5.00,
        discount_amount: 0,
        tax_amount: 4.50,
        total: 50.00,
        shipping_address: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        order_items: [
          {
            quantity: 2,
            unit_price: 22.50,
            product_snapshot: { name: 'Test Product' },
          },
        ],
      };

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify order was updated
      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
          payment_status: 'paid',
        })
      );

      // Verify payment record was created
      expect(mockSupabase.from).toHaveBeenCalledWith('payments');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: orderId,
          amount: 50,
          currency: 'usd',
          status: 'succeeded',
          provider: 'stripe',
        })
      );

      // Verify email was sent
      expect(mockSendOrderConfirmation).toHaveBeenCalled();
    });

    it('handles missing order_id in metadata gracefully', async () => {
      const event: Stripe.Event = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 5000,
            currency: 'usd',
            metadata: {}, // No order_id
          } as Stripe.PaymentIntent,
        },
        object: 'event',
        api_version: '2025-12-15.clover',
        created: Date.now() / 1000,
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test', idempotency_key: null },
      };

      mockConstructEvent.mockReturnValue(event);

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      // Should not attempt to update order
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });
  });

  describe('payment_intent.payment_failed', () => {
    it('updates order status and sends failure email', async () => {
      const orderId = 'order_456';
      const event = createPaymentIntentEvent('failed', orderId);

      mockConstructEvent.mockReturnValue(event);
      mockSupabase.data = {
        email: 'customer@test.com',
        order_number: 'ORD-002',
        shipping_address: { firstName: 'Jane' },
        total: 50.00,
      };

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify order payment status was updated
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'failed',
        })
      );

      // Verify failed payment record was created
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          provider_data: expect.objectContaining({
            error: 'Card declined',
          }),
        })
      );

      // Verify payment failed email was sent
      expect(mockSendPaymentFailedEmail).toHaveBeenCalledWith(
        'customer@test.com',
        expect.objectContaining({
          orderNumber: 'ORD-002',
          reason: 'Card declined',
        })
      );
    });
  });

  describe('charge.refunded', () => {
    it('updates payment and order status for full refund', async () => {
      const event: Stripe.Event = {
        id: 'evt_refund123',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test123',
            payment_intent: 'pi_test123',
            amount_refunded: 5000,
            refunded: true,
          } as Stripe.Charge,
        },
        object: 'event',
        api_version: '2025-12-15.clover',
        created: Date.now() / 1000,
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test', idempotency_key: null },
      };

      mockConstructEvent.mockReturnValue(event);
      mockSupabase.data = {
        id: 'payment_123',
        order_id: 'order_789',
      };

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify payment was updated
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'refunded',
          refunded_amount: 50,
        })
      );
    });

    it('updates order status for partial refund', async () => {
      const event: Stripe.Event = {
        id: 'evt_refund456',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test456',
            payment_intent: 'pi_test456',
            amount_refunded: 2500,
            refunded: false, // Partial refund
          } as Stripe.Charge,
        },
        object: 'event',
        api_version: '2025-12-15.clover',
        created: Date.now() / 1000,
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test', idempotency_key: null },
      };

      mockConstructEvent.mockReturnValue(event);
      mockSupabase.data = {
        id: 'payment_456',
        order_id: 'order_999',
      };

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify partial refund status
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'partially_refunded',
          refunded_amount: 25,
        })
      );
    });
  });

  describe('checkout.session.completed', () => {
    it('updates order status when payment is complete', async () => {
      const event: Stripe.Event = {
        id: 'evt_checkout123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test123',
            payment_status: 'paid',
            metadata: { order_id: 'order_checkout' },
          } as Stripe.Checkout.Session,
        },
        object: 'event',
        api_version: '2025-12-15.clover',
        created: Date.now() / 1000,
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test', idempotency_key: null },
      };

      mockConstructEvent.mockReturnValue(event);

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
          payment_status: 'paid',
        })
      );
    });
  });

  describe('Subscription events', () => {
    it('handles subscription created/updated', async () => {
      const event: Stripe.Event = {
        id: 'evt_sub123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test123',
            status: 'active',
            metadata: { organization_id: 'org_123' },
            items: {
              data: [
                {
                  price: { id: 'price_pro' },
                  current_period_start: Date.now() / 1000,
                  current_period_end: (Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000,
                },
              ],
            },
          } as unknown as Stripe.Subscription,
        },
        object: 'event',
        api_version: '2025-12-15.clover',
        created: Date.now() / 1000,
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test', idempotency_key: null },
      };

      mockConstructEvent.mockReturnValue(event);

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.from).toHaveBeenCalledWith('organization_billing');
    });

    it('handles subscription cancelled', async () => {
      const event: Stripe.Event = {
        id: 'evt_sub_cancel',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test456',
            metadata: { organization_id: 'org_456' },
          } as Stripe.Subscription,
        },
        object: 'event',
        api_version: '2025-12-15.clover',
        created: Date.now() / 1000,
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test', idempotency_key: null },
      };

      mockConstructEvent.mockReturnValue(event);

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          plan: 'free',
        })
      );
    });
  });

  describe('Invoice events', () => {
    it('handles invoice payment succeeded', async () => {
      const event: Stripe.Event = {
        id: 'evt_invoice_paid',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test123',
            parent: {
              subscription_details: {
                subscription: 'sub_active',
              },
            },
          } as unknown as Stripe.Invoice,
        },
        object: 'event',
        api_version: '2025-12-15.clover',
        created: Date.now() / 1000,
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test', idempotency_key: null },
      };

      mockConstructEvent.mockReturnValue(event);

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('handles invoice payment failed', async () => {
      const event: Stripe.Event = {
        id: 'evt_invoice_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test456',
            parent: {
              subscription_details: {
                subscription: 'sub_past_due',
              },
            },
          } as unknown as Stripe.Invoice,
        },
        object: 'event',
        api_version: '2025-12-15.clover',
        created: Date.now() / 1000,
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test', idempotency_key: null },
      };

      mockConstructEvent.mockReturnValue(event);

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'past_due',
        })
      );
    });
  });

  describe('Unhandled events', () => {
    it('returns success for unhandled event types', async () => {
      const event: Stripe.Event = {
        id: 'evt_unknown',
        type: 'some.unknown.event' as any,
        data: { object: {} as any },
        object: 'event',
        api_version: '2025-12-15.clover',
        created: Date.now() / 1000,
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test', idempotency_key: null },
      };

      mockConstructEvent.mockReturnValue(event);

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('returns 500 when handler throws an error', async () => {
      const event = createPaymentIntentEvent('succeeded', 'order_error');
      mockConstructEvent.mockReturnValue(event);

      // Make supabase throw an error
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = createRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Webhook handler failed');
    });
  });
});
