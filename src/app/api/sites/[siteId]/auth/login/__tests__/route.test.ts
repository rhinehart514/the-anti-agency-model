import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

// Mock Supabase client with chainable methods
const createMockChain = () => {
  const results: Map<string, any> = new Map();

  const chain: any = {
    from: vi.fn((table: string) => {
      chain._currentTable = table;
      return chain;
    }),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    single: vi.fn(() => {
      const result = results.get(chain._currentTable);
      return Promise.resolve(result || { data: null, error: null });
    }),
    _currentTable: '',
    _results: results,
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

describe('Site Auth Login API', () => {
  const siteId = 'site_123';
  const validPassword = 'password123';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(validPassword, 10);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockChain();
    mockWithRateLimit.mockReturnValue({ allowed: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function createRequest(body: any): NextRequest {
    return new NextRequest(`http://localhost:3000/api/sites/${siteId}/auth/login`, {
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
      const request = createRequest({ password: validPassword });
      const response = await POST(request, { params: { siteId } });

      expect(response.status).toBe(400);
    });

    it('returns 400 if email is invalid', async () => {
      const request = createRequest({
        email: 'not-an-email',
        password: validPassword,
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

  describe('Authentication', () => {
    it('returns 401 if user does not exist', async () => {
      mockSupabase.setResult('site_users', null, { message: 'Not found' });

      const request = createRequest({
        email: 'nonexistent@example.com',
        password: validPassword,
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');
    });

    it('returns 401 if password is incorrect', async () => {
      const wrongPasswordHash = await bcrypt.hash('differentpassword', 10);
      mockSupabase.setResult('site_users', {
        id: 'user_123',
        email: 'test@example.com',
        password_hash: wrongPasswordHash,
        name: 'Test User',
        site_id: siteId,
      });

      const request = createRequest({
        email: 'test@example.com',
        password: validPassword,
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');
    });

    it('returns user and session on successful login', async () => {
      mockSupabase.setResult('site_users', {
        id: 'user_123',
        email: 'test@example.com',
        password_hash: passwordHash,
        name: 'Test User',
        site_id: siteId,
        avatar_url: null,
        metadata: {},
        email_verified: true,
        created_at: '2025-01-01T00:00:00Z',
      });
      mockSupabase.setResult('site_user_roles', null);
      mockSupabase.setResult('site_sessions', {
        id: 'session_123',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const request = createRequest({
        email: 'test@example.com',
        password: validPassword,
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user_123');
      expect(data.user.email).toBe('test@example.com');
      expect(data.session).toBeDefined();
      expect(data.session.token).toBeDefined();
      expect(data.session.token.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it('returns user roles on successful login', async () => {
      mockSupabase.setResult('site_users', {
        id: 'user_123',
        email: 'test@example.com',
        password_hash: passwordHash,
        name: 'Test User',
        site_id: siteId,
      });

      // Override from to handle multiple queries
      const originalFrom = mockSupabase.from;
      mockSupabase.from = vi.fn((table: string) => {
        mockSupabase._currentTable = table;
        if (table === 'site_user_roles') {
          return {
            ...mockSupabase,
            single: vi.fn(() => Promise.resolve({
              data: [{ site_role_id: 'role_123' }],
              error: null,
            })),
          };
        }
        if (table === 'site_roles') {
          return {
            ...mockSupabase,
            in: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: [{ id: 'role_123', name: 'Member', permissions: ['content:read'] }],
                error: null,
              })),
            })),
          };
        }
        return originalFrom(table);
      });

      mockSupabase.setResult('site_sessions', {
        id: 'session_123',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const request = createRequest({
        email: 'test@example.com',
        password: validPassword,
      });
      const response = await POST(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.roles).toBeDefined();
    });
  });

  describe('Session creation', () => {
    it('returns 500 if session creation fails', async () => {
      mockSupabase.setResult('site_users', {
        id: 'user_123',
        email: 'test@example.com',
        password_hash: passwordHash,
        name: 'Test User',
        site_id: siteId,
      });
      mockSupabase.setResult('site_user_roles', null);
      mockSupabase.setResult('site_sessions', null, { message: 'Database error' });

      const request = createRequest({
        email: 'test@example.com',
        password: validPassword,
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
        password: validPassword,
      });
      const response = await POST(request, { params: { siteId } });

      expect(response.status).toBe(429);
    });
  });
});
