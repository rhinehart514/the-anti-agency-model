import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'ABC123XYZ0',
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const SITE_ID = 'site-123';

// Mock data
const mockOrder = {
  id: 'order-123',
  site_id: SITE_ID,
  customer_id: 'customer-123',
  order_number: 'ORD-ABC123XYZ0',
  status: 'pending',
  payment_status: 'pending',
  subtotal: 100,
  discount_amount: 0,
  tax_amount: 8,
  shipping_cost: 10,
  total: 118,
  created_at: new Date().toISOString(),
};

const mockProduct = {
  id: 'product-123',
  name: 'Test Product',
  price: 50,
  images: ['image.jpg'],
};

const mockOrderWithItems = {
  ...mockOrder,
  order_items: [
    {
      id: 'item-1',
      product_id: 'product-123',
      quantity: 2,
      unit_price: 50,
      total_price: 100,
      products: { id: 'product-123', name: 'Test Product', images: ['image.jpg'] },
    },
  ],
  customers: { id: 'customer-123', email: 'test@example.com', name: 'Test User' },
};

// Helper to create mock request
function createRequest(
  method: string,
  searchParams?: Record<string, string>,
  body?: object
): NextRequest {
  let url = `http://localhost:3000/api/sites/${SITE_ID}/orders`;
  if (searchParams) {
    const params = new URLSearchParams(searchParams);
    url += `?${params.toString()}`;
  }
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

// Helper to create chainable query mock for GET requests
// This mock properly handles the chain: from -> select -> eq -> range -> order -> (optional eq filters)
function createOrdersQueryMock(
  returnValue: { data: unknown; count: number | null; error: unknown }
) {
  const eqCalls: Array<[string, string]> = [];

  // Create a chainable object that tracks eq calls and eventually resolves
  // Note: Define object first, then add self-referential methods
  const chainable: Record<string, unknown> = {};

  chainable.select = vi.fn().mockReturnValue(chainable);
  chainable.eq = vi.fn((field: string, value: string) => {
    eqCalls.push([field, value]);
    return chainable;
  });
  chainable.range = vi.fn().mockReturnValue(chainable);
  chainable.order = vi.fn().mockReturnValue(chainable);
  // Make it thenable so await works
  chainable.then = (resolve: (value: unknown) => void) => {
    resolve(returnValue);
  };

  return { chainable, eqCalls };
}

describe('GET /api/sites/[siteId]/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns orders with default pagination', async () => {
    const { chainable } = createOrdersQueryMock({
      data: [mockOrderWithItems],
      count: 1,
      error: null,
    });
    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET');
    const response = await GET(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.orders).toHaveLength(1);
    expect(data.pagination).toEqual({
      total: 1,
      limit: 50,
      offset: 0,
      hasMore: false,
    });
  });

  it('returns orders with custom pagination', async () => {
    const { chainable } = createOrdersQueryMock({
      data: [mockOrderWithItems],
      count: 100,
      error: null,
    });
    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET', { limit: '10', offset: '20' });
    const response = await GET(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination).toEqual({
      total: 100,
      limit: 10,
      offset: 20,
      hasMore: true,
    });
  });

  it('filters orders by status', async () => {
    const { chainable, eqCalls } = createOrdersQueryMock({
      data: [{ ...mockOrderWithItems, status: 'completed' }],
      count: 1,
      error: null,
    });
    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET', { status: 'completed' });
    const response = await GET(request, { params: { siteId: SITE_ID } });

    expect(response.status).toBe(200);
    // Check that eq was called with status filter (in addition to site_id)
    expect(eqCalls).toContainEqual(['status', 'completed']);
  });

  it('filters orders by paymentStatus', async () => {
    const { chainable, eqCalls } = createOrdersQueryMock({
      data: [{ ...mockOrderWithItems, payment_status: 'paid' }],
      count: 1,
      error: null,
    });
    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET', { paymentStatus: 'paid' });
    const response = await GET(request, { params: { siteId: SITE_ID } });

    expect(response.status).toBe(200);
    expect(eqCalls).toContainEqual(['payment_status', 'paid']);
  });

  it('filters orders by customerId', async () => {
    const { chainable, eqCalls } = createOrdersQueryMock({
      data: [mockOrderWithItems],
      count: 1,
      error: null,
    });
    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET', { customerId: 'customer-456' });
    const response = await GET(request, { params: { siteId: SITE_ID } });

    expect(response.status).toBe(200);
    expect(eqCalls).toContainEqual(['customer_id', 'customer-456']);
  });

  it('applies multiple filters', async () => {
    const { chainable, eqCalls } = createOrdersQueryMock({
      data: [],
      count: 0,
      error: null,
    });
    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET', {
      status: 'completed',
      paymentStatus: 'paid',
      customerId: 'customer-789',
    });
    const response = await GET(request, { params: { siteId: SITE_ID } });

    expect(response.status).toBe(200);
    expect(eqCalls).toContainEqual(['site_id', SITE_ID]);
    expect(eqCalls).toContainEqual(['status', 'completed']);
    expect(eqCalls).toContainEqual(['payment_status', 'paid']);
    expect(eqCalls).toContainEqual(['customer_id', 'customer-789']);
  });

  it('returns empty array when no orders exist', async () => {
    const { chainable } = createOrdersQueryMock({
      data: [],
      count: 0,
      error: null,
    });
    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET');
    const response = await GET(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.orders).toEqual([]);
    expect(data.pagination.total).toBe(0);
  });

  it('returns 500 when database query fails', async () => {
    const { chainable } = createOrdersQueryMock({
      data: null,
      count: null,
      error: { message: 'Database error' },
    });
    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET');
    const response = await GET(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch orders');
  });
});

describe('POST /api/sites/[siteId]/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when items are missing', async () => {
    const request = createRequest('POST', undefined, {});
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Order items are required');
  });

  it('returns 400 when items array is empty', async () => {
    const request = createRequest('POST', undefined, { items: [] });
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Order items are required');
  });

  it('returns 400 when product is not found', async () => {
    // Create chainable for product lookup that returns null
    const productChainable: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(productChainable);

    const request = createRequest('POST', undefined, {
      items: [{ productId: 'nonexistent', quantity: 1 }],
    });
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Product not found');
  });

  it('creates order successfully with valid data', async () => {
    // Mock product lookup
    const productChainable: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
    };

    // Mock order insert
    const orderInsertChainable: Record<string, unknown> = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
    };

    // Mock order items insert
    const itemsInsertChainable: Record<string, unknown> = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    // Mock complete order fetch
    const completeOrderChainable: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrderWithItems, error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(productChainable) // products lookup
      .mockReturnValueOnce(orderInsertChainable) // orders insert
      .mockReturnValueOnce(itemsInsertChainable) // order_items insert
      .mockReturnValueOnce(completeOrderChainable); // orders select complete

    const request = createRequest('POST', undefined, {
      customerId: 'customer-123',
      items: [{ productId: 'product-123', quantity: 2 }],
      shippingCost: 10,
      taxAmount: 8,
      shippingAddress: { street: '123 Main St' },
    });
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.order).toBeDefined();
    expect(data.order.order_items).toBeDefined();
  });

  it('calculates totals correctly', async () => {
    let capturedOrderData: Record<string, unknown> | null = null;

    const productChainable: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
    };

    const orderInsertChainable: Record<string, unknown> = {
      insert: vi.fn((data: Record<string, unknown>) => {
        capturedOrderData = data;
        return orderInsertChainable;
      }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
    };

    const itemsInsertChainable: Record<string, unknown> = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    const completeOrderChainable: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrderWithItems, error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(productChainable)
      .mockReturnValueOnce(orderInsertChainable)
      .mockReturnValueOnce(itemsInsertChainable)
      .mockReturnValueOnce(completeOrderChainable);

    const request = createRequest('POST', undefined, {
      items: [{ productId: 'product-123', quantity: 2 }], // 2 x $50 = $100
      shippingCost: 15,
      taxAmount: 10,
      discountAmount: 5,
    });
    await POST(request, { params: { siteId: SITE_ID } });

    expect(capturedOrderData).not.toBeNull();
    expect(capturedOrderData!.subtotal).toBe(100); // 2 x $50
    expect(capturedOrderData!.shipping_cost).toBe(15);
    expect(capturedOrderData!.tax_amount).toBe(10);
    expect(capturedOrderData!.discount_amount).toBe(5);
    expect(capturedOrderData!.total).toBe(120); // 100 + 15 + 10 - 5
  });

  it('generates unique order number', async () => {
    let capturedOrderData: Record<string, unknown> | null = null;

    const productChainable: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
    };

    const orderInsertChainable: Record<string, unknown> = {
      insert: vi.fn((data: Record<string, unknown>) => {
        capturedOrderData = data;
        return orderInsertChainable;
      }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
    };

    const itemsInsertChainable: Record<string, unknown> = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    const completeOrderChainable: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrderWithItems, error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(productChainable)
      .mockReturnValueOnce(orderInsertChainable)
      .mockReturnValueOnce(itemsInsertChainable)
      .mockReturnValueOnce(completeOrderChainable);

    const request = createRequest('POST', undefined, {
      items: [{ productId: 'product-123', quantity: 1 }],
    });
    await POST(request, { params: { siteId: SITE_ID } });

    expect(capturedOrderData!.order_number).toBe('ORD-ABC123XYZ0');
  });

  it('returns 500 when order creation fails', async () => {
    const productChainable: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
    };

    const orderInsertChainable: Record<string, unknown> = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockSupabase.from
      .mockReturnValueOnce(productChainable)
      .mockReturnValueOnce(orderInsertChainable);

    const request = createRequest('POST', undefined, {
      items: [{ productId: 'product-123', quantity: 1 }],
    });
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create order');
  });
});
