import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '../route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/email/send', () => ({
  sendInvitationEmail: vi.fn(),
}));

// Note: crypto.randomBytes is used but doesn't need mocking - just let it generate real tokens

import { createClient } from '@/lib/supabase/server';
import { sendInvitationEmail } from '@/lib/email/send';

// Helper to create mock request
function createMockRequest(body?: object, method = 'GET'): NextRequest {
  const url = 'http://localhost/api/organizations/org-123/members';
  if (method === 'GET') {
    return new NextRequest(url);
  }
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// Create chainable Supabase mock
function createSupabaseMock(overrides: Record<string, any> = {}) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: overrides.user || { id: 'user-123', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (overrides[table]) {
        return { ...chainable, ...overrides[table] };
      }
      return chainable;
    }),
  };
}

describe('Organization Members API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // GET Tests
  // ========================================================================
  describe('GET /api/organizations/[orgId]/members', () => {
    it('returns 401 when unauthenticated', async () => {
      const mockSupabase = createSupabaseMock();
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest();
      const response = await GET(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 403 when user is not a member', async () => {
      const mockSupabase = createSupabaseMock({
        organization_members: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest();
      const response = await GET(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });

    it('returns members list when authorized', async () => {
      const mockMembers = [
        { id: 'mem-1', user_id: 'user-123', role: 'owner', email: 'owner@test.com' },
        { id: 'mem-2', user_id: 'user-456', role: 'member', email: 'member@test.com' },
      ];

      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          // First call is for membership check
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          // Second call is for listing members
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest();
      const response = await GET(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(2);
    });
  });

  // ========================================================================
  // POST Tests
  // ========================================================================
  describe('POST /api/organizations/[orgId]/members', () => {
    it('returns 401 when unauthenticated', async () => {
      const mockSupabase = createSupabaseMock();
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ email: 'new@test.com', role: 'member' }, 'POST');
      const response = await POST(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(401);
    });

    it('returns 403 when user is not admin/owner', async () => {
      const mockSupabase = createSupabaseMock({
        organization_members: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ email: 'new@test.com', role: 'member' }, 'POST');
      const response = await POST(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(403);
    });

    it('returns 400 when email is missing', async () => {
      const mockSupabase = createSupabaseMock({
        organization_members: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ role: 'member' }, 'POST');
      const response = await POST(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Email and role are required');
    });

    it('returns 400 for invalid role', async () => {
      const mockSupabase = createSupabaseMock({
        organization_members: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ email: 'new@test.com', role: 'superadmin' }, 'POST');
      const response = await POST(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid role');
    });

    it('returns 400 when member limit reached on free plan', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          // Member count query
          return {
            select: vi.fn().mockResolvedValue({ count: 1, error: null }),
            eq: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'organization_billing') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'free' }, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ email: 'new@test.com', role: 'member' }, 'POST');
      const response = await POST(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Member limit reached');
    });

    it('returns 400 for duplicate invitation', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          return {
            select: vi.fn().mockResolvedValue({ count: 0, error: null }),
            eq: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'organization_billing') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'pro' }, error: null }),
          };
        }
        if (table === 'organization_invitations') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate key' },
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ email: 'existing@test.com', role: 'member' }, 'POST');
      const response = await POST(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('already invited');
    });

    it('creates invitation successfully', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          return {
            select: vi.fn().mockResolvedValue({ count: 0, error: null }),
            eq: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'organization_billing') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'pro' }, error: null }),
          };
        }
        if (table === 'organization_invitations') {
          return {
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
            single: vi.fn().mockResolvedValue({
              data: { id: 'inv-1', email: 'new@test.com', role: 'member' },
              error: null,
            }),
          };
        }
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { name: 'Test Org' }, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(sendInvitationEmail).mockResolvedValue({ success: true } as any);

      const request = createMockRequest({ email: 'new@test.com', role: 'member' }, 'POST');
      const response = await POST(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.invitation).toBeDefined();
      expect(sendInvitationEmail).toHaveBeenCalled();
    });

    it('continues even if email sending fails', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          return {
            select: vi.fn().mockResolvedValue({ count: 0, error: null }),
            eq: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'organization_billing') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'pro' }, error: null }),
          };
        }
        if (table === 'organization_invitations') {
          return {
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
            single: vi.fn().mockResolvedValue({
              data: { id: 'inv-1', email: 'new@test.com', role: 'member' },
              error: null,
            }),
          };
        }
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { name: 'Test Org' }, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(sendInvitationEmail).mockRejectedValue(new Error('Email service down'));

      const request = createMockRequest({ email: 'new@test.com', role: 'member' }, 'POST');
      const response = await POST(request, { params: { orgId: 'org-123' } });

      // Should still succeed - invitation was created
      expect(response.status).toBe(201);
    });
  });

  // ========================================================================
  // PATCH Tests
  // ========================================================================
  describe('PATCH /api/organizations/[orgId]/members', () => {
    it('returns 401 when unauthenticated', async () => {
      const mockSupabase = createSupabaseMock();
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'mem-1', role: 'admin' }, 'PATCH');
      const response = await PATCH(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(401);
    });

    it('returns 400 when memberId is missing', async () => {
      const mockSupabase = createSupabaseMock({
        organization_members: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ role: 'admin' }, 'PATCH');
      const response = await PATCH(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Member ID and role are required');
    });

    it('returns 404 when member not found', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          // Target member lookup
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'nonexistent', role: 'admin' }, 'PATCH');
      const response = await PATCH(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Member not found');
    });

    it('returns 400 when trying to change owner role', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner', user_id: 'other-user' },
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'owner-mem', role: 'member' }, 'PATCH');
      const response = await PATCH(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Cannot change owner role');
    });

    it('returns 400 when trying to change own role', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin', user_id: 'user-123' }, // Same as current user
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'self-mem', role: 'member' }, 'PATCH');
      const response = await PATCH(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Cannot change your own role');
    });

    it('returns 403 when admin tries to promote to admin', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'member', user_id: 'other-user' },
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'mem-1', role: 'admin' }, 'PATCH');
      const response = await PATCH(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Only owner can promote to admin');
    });

    it('successfully updates member role', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          if (callCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { role: 'member', user_id: 'other-user' },
                error: null,
              }),
            };
          }
          // Update call
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'mem-1', role: 'admin', user_id: 'other-user' },
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'mem-1', role: 'admin' }, 'PATCH');
      const response = await PATCH(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.member).toBeDefined();
      expect(body.member.role).toBe('admin');
    });
  });

  // ========================================================================
  // DELETE Tests
  // ========================================================================
  describe('DELETE /api/organizations/[orgId]/members', () => {
    it('returns 401 when unauthenticated', async () => {
      const mockSupabase = createSupabaseMock();
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'mem-1' }, 'DELETE');
      const response = await DELETE(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(401);
    });

    it('returns 400 when memberId is missing', async () => {
      const mockSupabase = createSupabaseMock();
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({}, 'DELETE');
      const response = await DELETE(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Member ID is required');
    });

    it('returns 404 when member not found', async () => {
      const mockSupabase = createSupabaseMock({
        organization_members: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'nonexistent' }, 'DELETE');
      const response = await DELETE(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(404);
    });

    it('returns 400 when owner tries to leave', async () => {
      const mockSupabase = createSupabaseMock({
        organization_members: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'owner', user_id: 'user-123' },
            error: null,
          }),
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'owner-mem' }, 'DELETE');
      const response = await DELETE(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Owner cannot leave');
    });

    it('allows user to remove themselves', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { role: 'member', user_id: 'user-123' },
                error: null,
              }),
            };
          }
          // Delete call
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'self-mem' }, 'DELETE');
      const response = await DELETE(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.removed).toBe(true);
    });

    it('returns 403 when admin tries to remove another admin', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            // Target member lookup
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { role: 'admin', user_id: 'other-admin' },
                error: null,
              }),
            };
          }
          // Current user membership check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'admin-mem' }, 'DELETE');
      const response = await DELETE(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Admin cannot remove another admin');
    });

    it('successfully removes member when owner', async () => {
      let callCount = 0;
      const mockSupabase = createSupabaseMock();
      mockSupabase.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'organization_members') {
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { role: 'member', user_id: 'other-user' },
                error: null,
              }),
            };
          }
          if (callCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest({ memberId: 'mem-1' }, 'DELETE');
      const response = await DELETE(request, { params: { orgId: 'org-123' } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.removed).toBe(true);
    });
  });
});
