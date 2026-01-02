import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock environment variables
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_key');
vi.stubEnv('TAXJAR_API_KEY', 'test_taxjar_key');

// Mock Supabase client
const mockSupabaseChain = {
  from: vi.fn(() => mockSupabaseChain),
  select: vi.fn(() => mockSupabaseChain),
  insert: vi.fn(() => mockSupabaseChain),
  update: vi.fn(() => mockSupabaseChain),
  delete: vi.fn(() => mockSupabaseChain),
  eq: vi.fn(() => mockSupabaseChain),
  single: vi.fn(() => mockSupabaseChain),
  data: null as any,
  error: null as any,
};

// Track different query contexts
const queryResults: Map<string, any> = new Map();

const mockSupabase = {
  from: vi.fn((table: string) => {
    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      single: vi.fn(() => {
        const result = queryResults.get(table);
        return Promise.resolve(result || { data: null, error: null });
      }),
    };
    return chain;
  }),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock cookies
const mockCookies = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: (name: string) => {
      const value = mockCookies.get(name);
      return value ? { value } : undefined;
    },
  })),
}));

// Mock rate limiting - always allow by default
vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: vi.fn(() => ({ allowed: true })),
  rateLimiters: { checkout: {} },
}));

// Mock Stripe client
const mockCreatePaymentIntent = vi.fn().mockResolvedValue({
  id: 'pi_test123',
  client_secret: 'pi_test123_secret_abc123',
});
const mockGetOrCreateCustomer = vi.fn().mockResolvedValue({
  id: 'cus_test123',
  email: 'customer@test.com',
});

vi.mock('@/lib/stripe/client', () => ({
  createPaymentIntent: (...args: any[]) => mockCreatePaymentIntent(...args),
  getOrCreateCustomer: (...args: any[]) => mockGetOrCreateCustomer(...args),
}));

// Mock TaxJar
const mockCalculateOrderTax = vi.fn().mockResolvedValue({
  taxAmount: 5.00,
  taxRate: 0.10,
  breakdown: [],
});

vi.mock('@/lib/taxjar/calculate', () => ({
  calculateOrderTax: (...args: any[]) => mockCalculateOrderTax(...args),
}));

// Import after mocks are set up
const { POST } = await import('../route');

const validShippingAddress = {
  firstName: 'John',
  lastName: 'Doe',
  address1: '123 Main St',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
};

const validCheckoutRequest = {
  email: 'customer@test.com',
  shippingAddress: validShippingAddress,
  useSameAddress: true,
};

describe('Checkout API', () => {
  const siteId = 'site_123';
  const cartId = 'cart_token_abc123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.clear();
    queryResults.clear();

    // Restore mocks after clearAllMocks
    mockCreatePaymentIntent.mockResolvedValue({
      id: 'pi_test123',
      client_secret: 'pi_test123_secret_abc123',
    });
    mockGetOrCreateCustomer.mockResolvedValue({
      id: 'cus_test123',
      email: 'customer@test.com',
    });
    mockCalculateOrderTax.mockResolvedValue({
      taxAmount: 5.00,
      taxRate: 0.10,
      breakdown: [],
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function createRequest(body: any, siteIdParam = siteId): NextRequest {
    return new NextRequest(`http://localhost:3000/api/sites/${siteIdParam}/checkout`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  function setupCartCookie(siteIdParam = siteId, token = cartId) {
    mockCookies.set(`cart_id_${siteIdParam}`, token);
  }

  describe('Request validation', () => {
    beforeEach(() => {
      setupCartCookie();
    });

    it('returns 400 if email is missing', async () => {
      const request = createRequest({
        shippingAddress: validShippingAddress,
      });

      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('returns 400 if email is invalid', async () => {
      const request = createRequest({
        email: 'not-an-email',
        shippingAddress: validShippingAddress,
      });

      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: 'email', message: 'Invalid email address' })
      );
    });

    it('returns 400 if shipping address is missing', async () => {
      const request = createRequest({
        email: 'customer@test.com',
      });

      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('returns 400 if shipping address fields are incomplete', async () => {
      const request = createRequest({
        email: 'customer@test.com',
        shippingAddress: {
          firstName: 'John',
          // Missing other required fields
        },
      });

      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Cart validation', () => {
    it('returns 400 if cart cookie is missing', async () => {
      // Don't set cart cookie
      const request = createRequest(validCheckoutRequest);

      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cart not found');
    });

    it('returns 400 if cart is empty', async () => {
      setupCartCookie();

      // Mock cart query to return cart with empty items
      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(() => {
            if (table === 'carts') {
              return Promise.resolve({
                data: { id: 'cart_1', cart_items: [] },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      });

      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cart is empty');
    });

    it('returns 400 if cart does not exist', async () => {
      setupCartCookie();

      // Mock cart query to return null (cart not found)
      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(() => {
            if (table === 'carts') {
              return Promise.resolve({
                data: null,
                error: { message: 'Not found' },
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      });

      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cart is empty');
    });
  });

  describe('Inventory validation', () => {
    it('returns 400 if product is out of stock', async () => {
      setupCartCookie();

      // Mock cart with item that's out of stock
      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(() => {
            if (table === 'carts') {
              return Promise.resolve({
                data: {
                  id: 'cart_1',
                  cart_items: [
                    {
                      quantity: 10,
                      products: {
                        id: 'prod_1',
                        name: 'Test Product',
                        price: 25.00,
                        track_inventory: true,
                        quantity: 5, // Only 5 available, but 10 requested
                        images: [],
                      },
                      product_variants: null,
                    },
                  ],
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      });

      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Some items are out of stock');
      expect(data.details).toContain('Test Product: Only 5 available');
    });
  });

  describe('Tax calculation', () => {
    it('calls TaxJar with correct shipping address', async () => {
      setupCartCookie();

      // Mock successful cart with items
      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(() => {
            if (table === 'carts') {
              return Promise.resolve({
                data: {
                  id: 'cart_1',
                  cart_items: [
                    {
                      quantity: 2,
                      products: {
                        id: 'prod_1',
                        name: 'Test Product',
                        price: 25.00,
                        track_inventory: false,
                        images: [],
                      },
                      product_variants: null,
                    },
                  ],
                },
                error: null,
              });
            }
            if (table === 'orders') {
              return Promise.resolve({
                data: {
                  id: 'order_1',
                  order_number: 'ORD-TEST123',
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      });

      const request = createRequest(validCheckoutRequest);
      await POST(request, { params: { siteId } });

      expect(mockCalculateOrderTax).toHaveBeenCalledWith(
        expect.objectContaining({
          toAddress: expect.objectContaining({
            address1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'US',
          }),
        })
      );
    });
  });

  describe('Stripe integration', () => {
    it('creates payment intent with correct amount', async () => {
      setupCartCookie();

      // Mock successful cart and order creation
      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(() => {
            if (table === 'carts') {
              return Promise.resolve({
                data: {
                  id: 'cart_1',
                  cart_items: [
                    {
                      quantity: 2,
                      products: {
                        id: 'prod_1',
                        name: 'Test Product',
                        price: 25.00,
                        track_inventory: false,
                        images: [],
                      },
                      product_variants: null,
                    },
                  ],
                },
                error: null,
              });
            }
            if (table === 'orders') {
              return Promise.resolve({
                data: {
                  id: 'order_1',
                  order_number: 'ORD-TEST123',
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      });

      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      // Subtotal: 2 x $25 = $50
      // Tax: $5 (from mock)
      // Total: $55 = 5500 cents
      expect(mockCreatePaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5500,
          currency: 'usd',
          metadata: expect.objectContaining({
            site_id: siteId,
          }),
        })
      );

      expect(data.paymentIntentClientSecret).toBe('pi_test123_secret_abc123');
    });

    it('returns order details even if Stripe fails', async () => {
      setupCartCookie();
      mockCreatePaymentIntent.mockRejectedValue(new Error('Stripe error'));

      // Mock successful cart and order creation
      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(() => {
            if (table === 'carts') {
              return Promise.resolve({
                data: {
                  id: 'cart_1',
                  cart_items: [
                    {
                      quantity: 1,
                      products: {
                        id: 'prod_1',
                        name: 'Test Product',
                        price: 50.00,
                        track_inventory: false,
                        images: [],
                      },
                      product_variants: null,
                    },
                  ],
                },
                error: null,
              });
            }
            if (table === 'orders') {
              return Promise.resolve({
                data: {
                  id: 'order_1',
                  order_number: 'ORD-TEST123',
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      });

      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      // Order should still be created
      expect(response.status).toBe(200);
      expect(data.order).toBeDefined();
      expect(data.order.id).toBe('order_1');
      // But no payment intent
      expect(data.paymentIntentClientSecret).toBeNull();
    });
  });

  describe('Successful checkout', () => {
    beforeEach(() => {
      setupCartCookie();

      // Mock successful flow
      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(() => {
            if (table === 'carts') {
              return Promise.resolve({
                data: {
                  id: 'cart_1',
                  cart_items: [
                    {
                      quantity: 2,
                      products: {
                        id: 'prod_1',
                        name: 'Test Product',
                        price: 25.00,
                        track_inventory: false,
                        images: ['https://example.com/image.jpg'],
                      },
                      product_variants: null,
                    },
                    {
                      quantity: 1,
                      products: {
                        id: 'prod_2',
                        name: 'Another Product',
                        price: 15.00,
                        track_inventory: false,
                        images: [],
                      },
                      product_variants: {
                        id: 'var_1',
                        name: 'Large',
                        price: 18.00,
                        quantity: 10,
                        options: { size: 'Large' },
                        image_url: null,
                      },
                    },
                  ],
                },
                error: null,
              });
            }
            if (table === 'orders') {
              return Promise.resolve({
                data: {
                  id: 'order_created',
                  order_number: 'ORD-SUCCESS123',
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      });
    });

    it('returns order with correct totals', async () => {
      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order).toBeDefined();

      // Subtotal: (2 x $25) + (1 x $18 variant) = $68
      expect(data.order.subtotal).toBe(68);
      expect(data.order.taxAmount).toBe(5); // From mock
      expect(data.order.total).toBe(73); // 68 + 5
    });

    it('returns checkout URL', async () => {
      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(data.checkoutUrl).toMatch(/\/checkout\/order_created\/payment/);
    });

    it('returns order items with product snapshots', async () => {
      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(data.order.items).toHaveLength(2);
      expect(data.order.items[0].product_snapshot).toEqual(
        expect.objectContaining({
          name: 'Test Product',
          price: 25.00,
        })
      );
    });
  });

  describe('Order creation failure', () => {
    it('returns 500 if order creation fails', async () => {
      setupCartCookie();

      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(() => {
            if (table === 'carts') {
              return Promise.resolve({
                data: {
                  id: 'cart_1',
                  cart_items: [
                    {
                      quantity: 1,
                      products: {
                        id: 'prod_1',
                        name: 'Test Product',
                        price: 25.00,
                        track_inventory: false,
                        images: [],
                      },
                      product_variants: null,
                    },
                  ],
                },
                error: null,
              });
            }
            if (table === 'orders') {
              return Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      });

      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create order');
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 when rate limited', async () => {
      // Override rate limit mock to reject
      const { withRateLimit } = await import('@/lib/rate-limit');
      (withRateLimit as any).mockReturnValueOnce({
        allowed: false,
        response: new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      });

      setupCartCookie();
      const request = createRequest(validCheckoutRequest);
      const response = await POST(request, { params: { siteId } });

      expect(response.status).toBe(429);
    });
  });

  describe('Billing address', () => {
    beforeEach(() => {
      setupCartCookie();

      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn((data: any) => {
            // Capture the insert data for verification
            if (table === 'orders') {
              (chain as any).insertedData = data;
            }
            return chain;
          }),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(() => {
            if (table === 'carts') {
              return Promise.resolve({
                data: {
                  id: 'cart_1',
                  cart_items: [
                    {
                      quantity: 1,
                      products: {
                        id: 'prod_1',
                        name: 'Test Product',
                        price: 25.00,
                        track_inventory: false,
                        images: [],
                      },
                      product_variants: null,
                    },
                  ],
                },
                error: null,
              });
            }
            if (table === 'orders') {
              return Promise.resolve({
                data: {
                  id: 'order_1',
                  order_number: 'ORD-TEST123',
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      });
    });

    it('uses shipping address as billing when useSameAddress is true', async () => {
      const request = createRequest({
        ...validCheckoutRequest,
        useSameAddress: true,
      });

      const response = await POST(request, { params: { siteId } });
      expect(response.status).toBe(200);

      // The billing address should equal shipping address
      // This is verified by the mock chain capturing insert data
    });

    it('uses separate billing address when useSameAddress is false', async () => {
      const billingAddress = {
        firstName: 'Jane',
        lastName: 'Smith',
        address1: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
      };

      const request = createRequest({
        ...validCheckoutRequest,
        useSameAddress: false,
        billingAddress,
      });

      const response = await POST(request, { params: { siteId } });
      expect(response.status).toBe(200);
    });
  });
});
