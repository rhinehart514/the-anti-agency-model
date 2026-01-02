import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const SITE_ID = 'site-123';

// Mock data
const mockCollection = {
  id: 'collection-123',
  site_id: SITE_ID,
  name: 'Products',
  slug: 'products',
  description: 'Product catalog',
  icon: 'Package',
  color: '#3b82f6',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockField = {
  id: 'field-1',
  collection_id: 'collection-123',
  name: 'Name',
  slug: 'name',
  type: 'text',
  config: {},
  is_required: true,
  is_unique: false,
  is_primary: true,
  order_index: 0,
};

const mockCollectionWithFields = {
  ...mockCollection,
  collection_fields: [mockField],
};

// Helper to create mock request
function createRequest(method: string, body?: object): NextRequest {
  const url = `http://localhost:3000/api/sites/${SITE_ID}/collections`;
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

// Helper to create chainable mock
function createChainable(
  returnValue: { data: unknown; error: unknown },
  countValue?: number
) {
  const chainable: Record<string, unknown> = {};
  chainable.select = vi.fn().mockReturnValue(chainable);
  chainable.insert = vi.fn().mockReturnValue(chainable);
  chainable.eq = vi.fn().mockReturnValue(chainable);
  chainable.order = vi.fn().mockReturnValue(chainable);
  chainable.single = vi.fn().mockResolvedValue(returnValue);
  // For non-single queries (like listing)
  chainable.then = (resolve: (value: unknown) => void) => {
    resolve({ ...returnValue, count: countValue });
  };
  return chainable;
}

describe('GET /api/sites/[siteId]/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns collections with fields', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.order = vi.fn().mockResolvedValue({
      data: [mockCollectionWithFields],
      error: null,
    });

    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET');
    const response = await GET(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.collections).toHaveLength(1);
    expect(data.collections[0].name).toBe('Products');
    expect(data.collections[0].collection_fields).toHaveLength(1);
  });

  it('returns empty array when no collections exist', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.order = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET');
    const response = await GET(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.collections).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    mockSupabase.from.mockReturnValue(chainable);

    const request = createRequest('GET');
    const response = await GET(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch collections');
  });
});

describe('POST /api/sites/[siteId]/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when name is missing', async () => {
    const request = createRequest('POST', { slug: 'products' });
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name and slug are required');
  });

  it('returns 400 when slug is missing', async () => {
    const request = createRequest('POST', { name: 'Products' });
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name and slug are required');
  });

  it('creates collection successfully without fields', async () => {
    const collectionInsert: Record<string, unknown> = {};
    collectionInsert.insert = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.select = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.single = vi.fn().mockResolvedValue({
      data: mockCollection,
      error: null,
    });

    const completeQuery: Record<string, unknown> = {};
    completeQuery.select = vi.fn().mockReturnValue(completeQuery);
    completeQuery.eq = vi.fn().mockReturnValue(completeQuery);
    completeQuery.single = vi.fn().mockResolvedValue({
      data: { ...mockCollection, collection_fields: [] },
      error: null,
    });

    mockSupabase.from
      .mockReturnValueOnce(collectionInsert) // data_collections.insert
      .mockReturnValueOnce(completeQuery); // data_collections.select (complete)

    const request = createRequest('POST', {
      name: 'Products',
      slug: 'products',
      description: 'Product catalog',
    });
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.collection).toBeDefined();
    expect(data.collection.name).toBe('Products');
  });

  it('creates collection with fields', async () => {
    const collectionInsert: Record<string, unknown> = {};
    collectionInsert.insert = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.select = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.single = vi.fn().mockResolvedValue({
      data: mockCollection,
      error: null,
    });

    const fieldsInsert: Record<string, unknown> = {};
    fieldsInsert.insert = vi.fn().mockResolvedValue({ error: null });

    const completeQuery: Record<string, unknown> = {};
    completeQuery.select = vi.fn().mockReturnValue(completeQuery);
    completeQuery.eq = vi.fn().mockReturnValue(completeQuery);
    completeQuery.single = vi.fn().mockResolvedValue({
      data: mockCollectionWithFields,
      error: null,
    });

    mockSupabase.from
      .mockReturnValueOnce(collectionInsert) // data_collections.insert
      .mockReturnValueOnce(fieldsInsert) // collection_fields.insert
      .mockReturnValueOnce(completeQuery); // data_collections.select (complete)

    const request = createRequest('POST', {
      name: 'Products',
      slug: 'products',
      fields: [
        {
          name: 'Name',
          slug: 'name',
          type: 'text',
          isRequired: true,
          isPrimary: true,
        },
      ],
    });
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.collection.collection_fields).toHaveLength(1);
    expect(fieldsInsert.insert).toHaveBeenCalled();
  });

  it('uses default icon and color when not provided', async () => {
    let capturedData: Record<string, unknown> | null = null;

    const collectionInsert: Record<string, unknown> = {};
    collectionInsert.insert = vi.fn((data: Record<string, unknown>) => {
      capturedData = data;
      return collectionInsert;
    });
    collectionInsert.select = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.single = vi.fn().mockResolvedValue({
      data: mockCollection,
      error: null,
    });

    const completeQuery: Record<string, unknown> = {};
    completeQuery.select = vi.fn().mockReturnValue(completeQuery);
    completeQuery.eq = vi.fn().mockReturnValue(completeQuery);
    completeQuery.single = vi.fn().mockResolvedValue({
      data: mockCollectionWithFields,
      error: null,
    });

    mockSupabase.from
      .mockReturnValueOnce(collectionInsert)
      .mockReturnValueOnce(completeQuery);

    const request = createRequest('POST', {
      name: 'Products',
      slug: 'products',
    });
    await POST(request, { params: { siteId: SITE_ID } });

    expect(capturedData).not.toBeNull();
    expect(capturedData!.icon).toBe('Database');
    expect(capturedData!.color).toBe('#3b82f6');
  });

  it('returns 500 when collection creation fails', async () => {
    const collectionInsert: Record<string, unknown> = {};
    collectionInsert.insert = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.select = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    mockSupabase.from.mockReturnValue(collectionInsert);

    const request = createRequest('POST', {
      name: 'Products',
      slug: 'products',
    });
    const response = await POST(request, { params: { siteId: SITE_ID } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create collection');
  });

  it('continues if field creation fails (non-blocking)', async () => {
    const collectionInsert: Record<string, unknown> = {};
    collectionInsert.insert = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.select = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.single = vi.fn().mockResolvedValue({
      data: mockCollection,
      error: null,
    });

    const fieldsInsert: Record<string, unknown> = {};
    fieldsInsert.insert = vi.fn().mockResolvedValue({
      error: { message: 'Fields error' },
    });

    const completeQuery: Record<string, unknown> = {};
    completeQuery.select = vi.fn().mockReturnValue(completeQuery);
    completeQuery.eq = vi.fn().mockReturnValue(completeQuery);
    completeQuery.single = vi.fn().mockResolvedValue({
      data: { ...mockCollection, collection_fields: [] },
      error: null,
    });

    mockSupabase.from
      .mockReturnValueOnce(collectionInsert)
      .mockReturnValueOnce(fieldsInsert)
      .mockReturnValueOnce(completeQuery);

    const request = createRequest('POST', {
      name: 'Products',
      slug: 'products',
      fields: [{ name: 'Name', slug: 'name', type: 'text' }],
    });
    const response = await POST(request, { params: { siteId: SITE_ID } });

    // Should still succeed even though fields failed
    expect(response.status).toBe(201);
  });

  it('handles multiple fields with correct order index', async () => {
    let capturedFields: Array<Record<string, unknown>> | null = null;

    const collectionInsert: Record<string, unknown> = {};
    collectionInsert.insert = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.select = vi.fn().mockReturnValue(collectionInsert);
    collectionInsert.single = vi.fn().mockResolvedValue({
      data: mockCollection,
      error: null,
    });

    const fieldsInsert: Record<string, unknown> = {};
    fieldsInsert.insert = vi.fn((fields: Array<Record<string, unknown>>) => {
      capturedFields = fields;
      return Promise.resolve({ error: null });
    });

    const completeQuery: Record<string, unknown> = {};
    completeQuery.select = vi.fn().mockReturnValue(completeQuery);
    completeQuery.eq = vi.fn().mockReturnValue(completeQuery);
    completeQuery.single = vi.fn().mockResolvedValue({
      data: mockCollectionWithFields,
      error: null,
    });

    mockSupabase.from
      .mockReturnValueOnce(collectionInsert)
      .mockReturnValueOnce(fieldsInsert)
      .mockReturnValueOnce(completeQuery);

    const request = createRequest('POST', {
      name: 'Products',
      slug: 'products',
      fields: [
        { name: 'Name', slug: 'name', type: 'text' },
        { name: 'Price', slug: 'price', type: 'number' },
        { name: 'Description', slug: 'description', type: 'textarea' },
      ],
    });
    await POST(request, { params: { siteId: SITE_ID } });

    expect(capturedFields).not.toBeNull();
    expect(capturedFields!.length).toBe(3);
    expect(capturedFields![0].order_index).toBe(0);
    expect(capturedFields![1].order_index).toBe(1);
    expect(capturedFields![2].order_index).toBe(2);
  });
});
