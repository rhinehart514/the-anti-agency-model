import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '../route';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const SITE_ID = 'site-123';
const COLLECTION_ID = 'collection-123';

// Mock data
const mockRecord = {
  id: 'record-123',
  collection_id: COLLECTION_ID,
  data: { name: 'Product 1', price: 99.99 },
  created_by: 'user-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCollection = {
  id: COLLECTION_ID,
  site_id: SITE_ID,
};

// Helper to create mock request
function createRequest(
  method: string,
  searchParams?: Record<string, string>,
  body?: object
): NextRequest {
  let url = `http://localhost:3000/api/sites/${SITE_ID}/collections/${COLLECTION_ID}/records`;
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

// Helper to create chainable query mock with thenable support
function createQueryMock(
  returnValue: { data: unknown; error: unknown },
  countValue?: number
) {
  const chainable: Record<string, unknown> = {};
  chainable.select = vi.fn().mockReturnValue(chainable);
  chainable.insert = vi.fn().mockReturnValue(chainable);
  chainable.update = vi.fn().mockReturnValue(chainable);
  chainable.delete = vi.fn().mockReturnValue(chainable);
  chainable.eq = vi.fn().mockReturnValue(chainable);
  chainable.in = vi.fn().mockReturnValue(chainable);
  chainable.range = vi.fn().mockReturnValue(chainable);
  chainable.order = vi.fn().mockReturnValue(chainable);
  chainable.single = vi.fn().mockResolvedValue(returnValue);
  // For awaitable non-single queries
  chainable.then = (resolve: (value: unknown) => void) => {
    resolve({ ...returnValue, count: countValue });
  };
  return chainable;
}

describe('GET /api/sites/[siteId]/collections/[collectionId]/records', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when collection does not exist', async () => {
    const collectionQuery = createQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(collectionQuery);

    const request = createRequest('GET');
    const response = await GET(request, {
      params: { siteId: SITE_ID, collectionId: 'nonexistent' },
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Collection not found');
  });

  it('returns 404 when collection belongs to different site', async () => {
    const collectionQuery = createQueryMock({
      data: null,
      error: { message: 'No rows found' },
    });
    mockSupabase.from.mockReturnValue(collectionQuery);

    const request = createRequest('GET');
    const response = await GET(request, {
      params: { siteId: 'different-site', collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Collection not found');
  });

  it('returns records with default pagination', async () => {
    const collectionQuery = createQueryMock({ data: mockCollection, error: null });

    // Records query needs thenable behavior
    const recordsQuery: Record<string, unknown> = {};
    recordsQuery.select = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.eq = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.range = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.order = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.then = (resolve: (value: unknown) => void) => {
      resolve({ data: [mockRecord], count: 1, error: null });
    };

    mockSupabase.from
      .mockReturnValueOnce(collectionQuery)
      .mockReturnValueOnce(recordsQuery);

    const request = createRequest('GET');
    const response = await GET(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.records).toHaveLength(1);
    expect(data.pagination).toEqual({
      total: 1,
      limit: 50,
      offset: 0,
      hasMore: false,
    });
  });

  it('returns records with custom pagination', async () => {
    const collectionQuery = createQueryMock({ data: mockCollection, error: null });

    const recordsQuery: Record<string, unknown> = {};
    recordsQuery.select = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.eq = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.range = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.order = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.then = (resolve: (value: unknown) => void) => {
      resolve({ data: [mockRecord], count: 100, error: null });
    };

    mockSupabase.from
      .mockReturnValueOnce(collectionQuery)
      .mockReturnValueOnce(recordsQuery);

    const request = createRequest('GET', { limit: '10', offset: '20' });
    const response = await GET(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination).toEqual({
      total: 100,
      limit: 10,
      offset: 20,
      hasMore: true,
    });
  });

  it('returns empty array when no records exist', async () => {
    const collectionQuery = createQueryMock({ data: mockCollection, error: null });

    const recordsQuery: Record<string, unknown> = {};
    recordsQuery.select = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.eq = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.range = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.order = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.then = (resolve: (value: unknown) => void) => {
      resolve({ data: [], count: 0, error: null });
    };

    mockSupabase.from
      .mockReturnValueOnce(collectionQuery)
      .mockReturnValueOnce(recordsQuery);

    const request = createRequest('GET');
    const response = await GET(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.records).toEqual([]);
    expect(data.pagination.total).toBe(0);
  });

  it('returns 500 when records query fails', async () => {
    const collectionQuery = createQueryMock({ data: mockCollection, error: null });

    const recordsQuery: Record<string, unknown> = {};
    recordsQuery.select = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.eq = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.range = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.order = vi.fn().mockReturnValue(recordsQuery);
    recordsQuery.then = (resolve: (value: unknown) => void) => {
      resolve({ data: null, count: null, error: { message: 'Database error' } });
    };

    mockSupabase.from
      .mockReturnValueOnce(collectionQuery)
      .mockReturnValueOnce(recordsQuery);

    const request = createRequest('GET');
    const response = await GET(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch records');
  });
});

describe('POST /api/sites/[siteId]/collections/[collectionId]/records', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when data is missing', async () => {
    const request = createRequest('POST', undefined, {});
    const response = await POST(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Data object is required');
  });

  it('returns 400 when data is not an object', async () => {
    const request = createRequest('POST', undefined, { data: 'invalid' });
    const response = await POST(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Data object is required');
  });

  it('returns 404 when collection does not exist', async () => {
    const collectionQuery = createQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(collectionQuery);

    const request = createRequest('POST', undefined, {
      data: { name: 'Test' },
    });
    const response = await POST(request, {
      params: { siteId: SITE_ID, collectionId: 'nonexistent' },
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Collection not found');
  });

  it('creates record successfully', async () => {
    const collectionQuery = createQueryMock({ data: mockCollection, error: null });

    const recordInsert: Record<string, unknown> = {};
    recordInsert.insert = vi.fn().mockReturnValue(recordInsert);
    recordInsert.select = vi.fn().mockReturnValue(recordInsert);
    recordInsert.single = vi.fn().mockResolvedValue({
      data: mockRecord,
      error: null,
    });

    mockSupabase.from
      .mockReturnValueOnce(collectionQuery)
      .mockReturnValueOnce(recordInsert);

    const request = createRequest('POST', undefined, {
      data: { name: 'Product 1', price: 99.99 },
      createdBy: 'user-123',
    });
    const response = await POST(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.record).toBeDefined();
    expect(data.record.data.name).toBe('Product 1');
  });

  it('captures created_by from request', async () => {
    let capturedInsert: Record<string, unknown> | null = null;

    const collectionQuery = createQueryMock({ data: mockCollection, error: null });

    const recordInsert: Record<string, unknown> = {};
    recordInsert.insert = vi.fn((insertData: Record<string, unknown>) => {
      capturedInsert = insertData;
      return recordInsert;
    });
    recordInsert.select = vi.fn().mockReturnValue(recordInsert);
    recordInsert.single = vi.fn().mockResolvedValue({
      data: mockRecord,
      error: null,
    });

    mockSupabase.from
      .mockReturnValueOnce(collectionQuery)
      .mockReturnValueOnce(recordInsert);

    const request = createRequest('POST', undefined, {
      data: { name: 'Test' },
      createdBy: 'user-456',
    });
    await POST(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });

    expect(capturedInsert).not.toBeNull();
    expect(capturedInsert!.created_by).toBe('user-456');
  });

  it('returns 500 when record creation fails', async () => {
    const collectionQuery = createQueryMock({ data: mockCollection, error: null });

    const recordInsert: Record<string, unknown> = {};
    recordInsert.insert = vi.fn().mockReturnValue(recordInsert);
    recordInsert.select = vi.fn().mockReturnValue(recordInsert);
    recordInsert.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    mockSupabase.from
      .mockReturnValueOnce(collectionQuery)
      .mockReturnValueOnce(recordInsert);

    const request = createRequest('POST', undefined, {
      data: { name: 'Test' },
    });
    const response = await POST(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create record');
  });
});

describe('PATCH /api/sites/[siteId]/collections/[collectionId]/records', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when recordIds is missing', async () => {
    const request = createRequest('PATCH', undefined, {
      updates: { name: 'Updated' },
    });
    const response = await PATCH(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Record IDs and updates are required');
  });

  it('returns 400 when updates is missing', async () => {
    const request = createRequest('PATCH', undefined, {
      recordIds: ['record-1'],
    });
    const response = await PATCH(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Record IDs and updates are required');
  });

  it('returns 400 when recordIds is not an array', async () => {
    const request = createRequest('PATCH', undefined, {
      recordIds: 'invalid',
      updates: { name: 'Updated' },
    });
    const response = await PATCH(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Record IDs and updates are required');
  });

  it('updates multiple records successfully', async () => {
    const updateQuery: Record<string, unknown> = {};
    updateQuery.update = vi.fn().mockReturnValue(updateQuery);
    updateQuery.eq = vi.fn().mockReturnValue(updateQuery);
    updateQuery.select = vi.fn().mockReturnValue(updateQuery);
    updateQuery.single = vi.fn().mockResolvedValue({
      data: { ...mockRecord, data: { name: 'Updated' } },
      error: null,
    });

    mockSupabase.from.mockReturnValue(updateQuery);

    const request = createRequest('PATCH', undefined, {
      recordIds: ['record-1', 'record-2'],
      updates: { name: 'Updated' },
      updatedBy: 'user-123',
    });
    const response = await PATCH(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.updated).toBe(2);
    expect(data.failed).toBe(0);
    expect(data.records).toHaveLength(2);
  });

  it('reports partial success when some updates fail', async () => {
    let callCount = 0;
    const updateQuery: Record<string, unknown> = {};
    updateQuery.update = vi.fn().mockReturnValue(updateQuery);
    updateQuery.eq = vi.fn().mockReturnValue(updateQuery);
    updateQuery.select = vi.fn().mockReturnValue(updateQuery);
    updateQuery.single = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          data: { ...mockRecord, data: { name: 'Updated' } },
          error: null,
        });
      }
      return Promise.resolve({
        data: null,
        error: { message: 'Not found' },
      });
    });

    mockSupabase.from.mockReturnValue(updateQuery);

    const request = createRequest('PATCH', undefined, {
      recordIds: ['record-1', 'record-2'],
      updates: { name: 'Updated' },
    });
    const response = await PATCH(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.updated).toBe(1);
    expect(data.failed).toBe(1);
  });
});

describe('DELETE /api/sites/[siteId]/collections/[collectionId]/records', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when recordIds is missing', async () => {
    const request = createRequest('DELETE', undefined, {});
    const response = await DELETE(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Record IDs are required');
  });

  it('returns 400 when recordIds is not an array', async () => {
    const request = createRequest('DELETE', undefined, {
      recordIds: 'invalid',
    });
    const response = await DELETE(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Record IDs are required');
  });

  it('deletes records successfully', async () => {
    const deleteQuery: Record<string, unknown> = {};
    deleteQuery.delete = vi.fn().mockReturnValue(deleteQuery);
    deleteQuery.in = vi.fn().mockReturnValue(deleteQuery);
    deleteQuery.eq = vi.fn().mockReturnValue(deleteQuery);
    deleteQuery.then = (resolve: (value: unknown) => void) => {
      resolve({ error: null });
    };

    mockSupabase.from.mockReturnValue(deleteQuery);

    const request = createRequest('DELETE', undefined, {
      recordIds: ['record-1', 'record-2', 'record-3'],
    });
    const response = await DELETE(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(3);
    expect(deleteQuery.in).toHaveBeenCalledWith('id', [
      'record-1',
      'record-2',
      'record-3',
    ]);
  });

  it('returns 500 when delete fails', async () => {
    const deleteQuery: Record<string, unknown> = {};
    deleteQuery.delete = vi.fn().mockReturnValue(deleteQuery);
    deleteQuery.in = vi.fn().mockReturnValue(deleteQuery);
    deleteQuery.eq = vi.fn().mockReturnValue(deleteQuery);
    deleteQuery.then = (resolve: (value: unknown) => void) => {
      resolve({ error: { message: 'Database error' } });
    };

    mockSupabase.from.mockReturnValue(deleteQuery);

    const request = createRequest('DELETE', undefined, {
      recordIds: ['record-1'],
    });
    const response = await DELETE(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete records');
  });

  it('scopes delete to collection_id', async () => {
    const deleteQuery: Record<string, unknown> = {};
    deleteQuery.delete = vi.fn().mockReturnValue(deleteQuery);
    deleteQuery.in = vi.fn().mockReturnValue(deleteQuery);
    deleteQuery.eq = vi.fn().mockReturnValue(deleteQuery);
    deleteQuery.then = (resolve: (value: unknown) => void) => {
      resolve({ error: null });
    };

    mockSupabase.from.mockReturnValue(deleteQuery);

    const request = createRequest('DELETE', undefined, {
      recordIds: ['record-1'],
    });
    await DELETE(request, {
      params: { siteId: SITE_ID, collectionId: COLLECTION_ID },
    });

    expect(deleteQuery.eq).toHaveBeenCalledWith('collection_id', COLLECTION_ID);
  });
});
