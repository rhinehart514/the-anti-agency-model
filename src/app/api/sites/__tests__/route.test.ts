import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock Supabase
const mockUser = { id: 'user-123', email: 'test@example.com' };
const mockSite = {
  id: 'site-123',
  slug: 'my-site',
  name: 'My Site',
  template_id: 'custom',
  owner_id: 'user-123',
  settings: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Helper to create mock request
function createRequest(method: string, body?: object): NextRequest {
  const url = 'http://localhost:3000/api/sites';
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

// Helper to create chainable mock
function createChainableMock(returnValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    order: vi.fn().mockResolvedValue(returnValue),
  };
  return chain;
}

describe('POST /api/sites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createRequest('POST', { name: 'Test', slug: 'test' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('You must be logged in to create a site');
  });

  it('returns 400 when name is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = createRequest('POST', { slug: 'test' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Site name and slug are required');
  });

  it('returns 400 when slug is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = createRequest('POST', { name: 'Test Site' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Site name and slug are required');
  });

  it('returns 400 when slug has invalid characters', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = createRequest('POST', { name: 'Test', slug: 'My Site!' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Slug can only contain lowercase letters, numbers, and hyphens');
  });

  it('returns 400 when slug has uppercase letters', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = createRequest('POST', { name: 'Test', slug: 'MySite' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Slug can only contain lowercase letters, numbers, and hyphens');
  });

  it('returns 409 when slug already exists', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const existingCheck = createChainableMock({ data: { id: 'existing-id' }, error: null });
    mockSupabase.from.mockReturnValue(existingCheck);

    const request = createRequest('POST', { name: 'Test', slug: 'existing-slug' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already exists');
  });

  it('creates site successfully with valid data', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // First call: check for existing slug (not found)
    const slugCheck = createChainableMock({ data: null, error: null });

    // Second call: insert site
    const siteInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockSite, error: null }),
    };

    // Third call: insert page
    const pageInsert = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(slugCheck) // sites.select for slug check
      .mockReturnValueOnce(siteInsert) // sites.insert
      .mockReturnValueOnce(pageInsert); // pages.insert

    const request = createRequest('POST', {
      name: 'My Site',
      slug: 'my-site',
      template_id: 'custom',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('site-123');
    expect(data.slug).toBe('my-site');
  });

  it('accepts valid slug with hyphens and numbers', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const slugCheck = createChainableMock({ data: null, error: null });
    const siteInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockSite, slug: 'my-site-2024' },
        error: null,
      }),
    };
    const pageInsert = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(slugCheck)
      .mockReturnValueOnce(siteInsert)
      .mockReturnValueOnce(pageInsert);

    const request = createRequest('POST', {
      name: 'My Site',
      slug: 'my-site-2024',
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it('returns 500 when site creation fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const slugCheck = createChainableMock({ data: null, error: null });
    const siteInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockSupabase.from
      .mockReturnValueOnce(slugCheck)
      .mockReturnValueOnce(siteInsert);

    const request = createRequest('POST', {
      name: 'My Site',
      slug: 'my-site',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create site');
  });
});

describe('GET /api/sites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('You must be logged in to view your sites');
  });

  it('returns empty array when user has no sites', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const sitesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabase.from.mockReturnValue(sitesQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('returns user sites successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSites = [
      mockSite,
      { ...mockSite, id: 'site-456', slug: 'another-site', name: 'Another Site' },
    ];

    const sitesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockSites, error: null }),
    };
    mockSupabase.from.mockReturnValue(sitesQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].slug).toBe('my-site');
    expect(data[1].slug).toBe('another-site');
  });

  it('returns 500 when database query fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const sitesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };
    mockSupabase.from.mockReturnValue(sitesQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch sites');
  });
});
