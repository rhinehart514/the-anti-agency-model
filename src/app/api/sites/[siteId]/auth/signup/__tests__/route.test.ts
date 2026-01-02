import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase client with chainable methods
const createMockChain = () => {
  const results: Map<string, any> = new Map();
  let insertData: any = null;

  const chain: any = {
    from: vi.fn((table: string) => {
      chain._currentTable = table;
      return chain;
    }),
    select: vi.fn(() => chain),
    insert: vi.fn((data: any) => {
      insertData = data;
      return chain;
    }),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => {
      const result = results.get(chain._currentTable);
      return Promise.resolve(result || { data: null, error: null });
    }),
    _currentTable: '',
    _results: results,
    _insertData: () => insertData,
    setResult: (table: string, data: any, error: any = null) => {
      results.set(table, { data, error });
    },
  };

  return chain;
};

let mockSupabase = createMockChain();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock rate limiting - always allow by default
const mockWithRateLimit = vi.fn(() => ({ allowed: true }));
vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: (...args: any[]) => mockWithRateLimit(...args),
  rateLimiters: { auth: {} },
}));

// Import after mocks
const { POST } = await import('../route');

describe('Site Auth Signup API', () => {
  const siteId = 'site_123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockChain();
    mockWithRateLimit.mockReturnValue({ allowed: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function createRequest(body: any): NextRequest {
    return new NextRequest(`http://localhost:3000/api/sites/${siteId}/auth/signup`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      },
    });
  }

  describe('Request validation', () => {
    it('returns 400 if email is missing', async () => {
      const request = createRequest({ password: 'password123' });
      const response = await POST(request, { params: { siteId } });

      expect(response.status).toBe(400);
    });

    it('returns 400 if email is invalid', async () => {
      const request = createRequest({
        email: 'not-an-email',
        password: 'password123',
      });
      const response = await POST(request, { params: { siteId } });

      expect(response.status).toBe(400);
    });

    it('returns 400 if password is missing', async () => {
      const request = createRequest({ email: 'test@example.com' });
      const response = await POST(request, { params: { siteId } });

      expect(response.status).toBe(400);
    });

    it('returns 400 if password is too short', async () => {
      const request = createRequest({
        email: 'test@example.com',
        password: 'short',
      });
      const response = await POST(request, { params: { siteId } });

      expect(response.status).toBe(400);
    });
  });

  describe('Site validation', () => {
    it('returns 404 if site does not exist', async () => {
      mockSupabase.setResult('sites', null, { message: 'Not found' });

      const request = createRequest({
        email: 'test@example.com',
        password: 'password123',
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Site not found');
    });
  });

  describe('User creation', () => {
    beforeEach(() => {
      // Site exists
      mockSupabase.setResult('sites', { id: siteId });
    });

    it('returns 400 if user already exists', async () => {
      mockSupabase.setResult('site_users', { id: 'existing_user' });

      const request = createRequest({
        email: 'existing@example.com',
        password: 'password123',
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User already exists');
    });

    it('creates user and returns user data on success', async () => {
      // First query for existing user returns null
      // Then user creation succeeds
      const mockChain: any = {
        from: vi.fn((table: string) => {
          mockChain._table = table;
          return mockChain;
        }),
        select: vi.fn(() => mockChain),
        insert: vi.fn(() => mockChain),
        update: vi.fn(() => mockChain),
        eq: vi.fn(() => mockChain),
        single: vi.fn(() => {
          if (mockChain._table === 'sites') {
            return Promise.resolve({ data: { id: siteId }, error: null });
          }
          if (mockChain._table === 'site_users') {
            // Check if this is the existence check or the creation
            if (!mockChain._userCreated) {
              mockChain._userCreated = true;
              return Promise.resolve({ data: null, error: null }); // User doesn't exist
            }
            return Promise.resolve({
              data: {
                id: 'new_user_123',
                email: 'newuser@example.com',
                name: 'New User',
                metadata: {},
                created_at: '2025-01-01T00:00:00Z',
              },
              error: null,
            });
          }
          if (mockChain._table === 'site_roles') {
            return Promise.resolve({
              data: { id: 'role_123', name: 'Member', is_default: true },
              error: null,
            });
          }
          if (mockChain._table === 'site_sessions') {
            return Promise.resolve({
              data: {
                id: 'session_123',
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        _table: '',
        _userCreated: false,
      };

      vi.mocked(vi.importActual('@/lib/supabase/server')).createClient = vi.fn(() =>
        Promise.resolve(mockChain)
      );

      // Update the mock
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as any).mockResolvedValue(mockChain);

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('newuser@example.com');
      expect(data.session).toBeDefined();
      expect(data.session.token).toBeDefined();
    });

    it('returns 500 if user creation fails', async () => {
      const mockChain: any = {
        from: vi.fn((table: string) => {
          mockChain._table = table;
          return mockChain;
        }),
        select: vi.fn(() => mockChain),
        insert: vi.fn(() => mockChain),
        update: vi.fn(() => mockChain),
        eq: vi.fn(() => mockChain),
        single: vi.fn(() => {
          if (mockChain._table === 'sites') {
            return Promise.resolve({ data: { id: siteId }, error: null });
          }
          if (mockChain._table === 'site_users') {
            if (!mockChain._checkDone) {
              mockChain._checkDone = true;
              return Promise.resolve({ data: null, error: null }); // User doesn't exist
            }
            return Promise.resolve({
              data: null,
              error: { message: 'Database error' },
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        _table: '',
        _checkDone: false,
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as any).mockResolvedValue(mockChain);

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create user');
    });
  });

  describe('Default role assignment', () => {
    it('assigns default role when one exists', async () => {
      const mockChain: any = {
        from: vi.fn((table: string) => {
          mockChain._table = table;
          return mockChain;
        }),
        select: vi.fn(() => mockChain),
        insert: vi.fn((data: any) => {
          if (mockChain._table === 'site_user_roles') {
            mockChain._roleAssigned = data;
          }
          return mockChain;
        }),
        update: vi.fn(() => mockChain),
        eq: vi.fn(() => mockChain),
        single: vi.fn(() => {
          if (mockChain._table === 'sites') {
            return Promise.resolve({ data: { id: siteId }, error: null });
          }
          if (mockChain._table === 'site_users') {
            if (!mockChain._userCreated) {
              mockChain._userCreated = true;
              return Promise.resolve({ data: null, error: null });
            }
            return Promise.resolve({
              data: {
                id: 'new_user_123',
                email: 'newuser@example.com',
                name: 'New User',
                metadata: {},
                created_at: '2025-01-01T00:00:00Z',
              },
              error: null,
            });
          }
          if (mockChain._table === 'site_roles') {
            return Promise.resolve({
              data: {
                id: 'default_role_123',
                name: 'Member',
                is_default: true,
                permissions: ['content:read'],
              },
              error: null,
            });
          }
          if (mockChain._table === 'site_sessions') {
            return Promise.resolve({
              data: {
                id: 'session_123',
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        _table: '',
        _userCreated: false,
        _roleAssigned: null,
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as any).mockResolvedValue(mockChain);

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.roles).toBeDefined();
      expect(data.roles[0].name).toBe('Member');
    });
  });

  describe('Session creation', () => {
    it('returns 500 if session creation fails', async () => {
      const mockChain: any = {
        from: vi.fn((table: string) => {
          mockChain._table = table;
          return mockChain;
        }),
        select: vi.fn(() => mockChain),
        insert: vi.fn(() => mockChain),
        update: vi.fn(() => mockChain),
        eq: vi.fn(() => mockChain),
        single: vi.fn(() => {
          if (mockChain._table === 'sites') {
            return Promise.resolve({ data: { id: siteId }, error: null });
          }
          if (mockChain._table === 'site_users') {
            if (!mockChain._userCreated) {
              mockChain._userCreated = true;
              return Promise.resolve({ data: null, error: null });
            }
            return Promise.resolve({
              data: {
                id: 'new_user_123',
                email: 'newuser@example.com',
                name: 'New User',
                metadata: {},
                created_at: '2025-01-01T00:00:00Z',
              },
              error: null,
            });
          }
          if (mockChain._table === 'site_roles') {
            return Promise.resolve({ data: null, error: null });
          }
          if (mockChain._table === 'site_sessions') {
            return Promise.resolve({
              data: null,
              error: { message: 'Database error' },
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        _table: '',
        _userCreated: false,
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as any).mockResolvedValue(mockChain);

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create session');
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 when rate limited', async () => {
      mockWithRateLimit.mockReturnValue({
        allowed: false,
        response: new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      });

      const request = createRequest({
        email: 'test@example.com',
        password: 'password123',
      });
      const response = await POST(request, { params: { siteId } });

      expect(response.status).toBe(429);
    });
  });

  describe('Metadata handling', () => {
    it('stores custom metadata when provided', async () => {
      const mockChain: any = {
        from: vi.fn((table: string) => {
          mockChain._table = table;
          return mockChain;
        }),
        select: vi.fn(() => mockChain),
        insert: vi.fn((data: any) => {
          if (mockChain._table === 'site_users') {
            mockChain._insertedUser = data;
          }
          return mockChain;
        }),
        update: vi.fn(() => mockChain),
        eq: vi.fn(() => mockChain),
        single: vi.fn(() => {
          if (mockChain._table === 'sites') {
            return Promise.resolve({ data: { id: siteId }, error: null });
          }
          if (mockChain._table === 'site_users') {
            if (!mockChain._userCreated) {
              mockChain._userCreated = true;
              return Promise.resolve({ data: null, error: null });
            }
            return Promise.resolve({
              data: {
                id: 'new_user_123',
                email: 'newuser@example.com',
                name: 'New User',
                metadata: { referrer: 'google', plan: 'pro' },
                created_at: '2025-01-01T00:00:00Z',
              },
              error: null,
            });
          }
          if (mockChain._table === 'site_roles') {
            return Promise.resolve({ data: null, error: null });
          }
          if (mockChain._table === 'site_sessions') {
            return Promise.resolve({
              data: {
                id: 'session_123',
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        _table: '',
        _userCreated: false,
        _insertedUser: null,
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as any).mockResolvedValue(mockChain);

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'password123',
        metadata: { referrer: 'google', plan: 'pro' },
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.metadata).toEqual({ referrer: 'google', plan: 'pro' });
    });
  });
});
