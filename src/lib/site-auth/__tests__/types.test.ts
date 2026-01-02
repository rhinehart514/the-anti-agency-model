import { describe, it, expect } from 'vitest';
import {
  LoginCredentialsSchema,
  SignupCredentialsSchema,
  SiteUserSchema,
  SiteRoleSchema,
  PERMISSIONS,
} from '../types';

describe('Site Auth Types', () => {
  describe('LoginCredentialsSchema', () => {
    it('validates correct login credentials', () => {
      const result = LoginCredentialsSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.password).toBe('password123');
      }
    });

    it('rejects missing email', () => {
      const result = LoginCredentialsSchema.safeParse({
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = LoginCredentialsSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = LoginCredentialsSchema.safeParse({
        email: 'test@example.com',
      });

      expect(result.success).toBe(false);
    });

    it('rejects password shorter than 8 characters', () => {
      const result = LoginCredentialsSchema.safeParse({
        email: 'test@example.com',
        password: 'short',
      });

      expect(result.success).toBe(false);
    });

    it('accepts password exactly 8 characters', () => {
      const result = LoginCredentialsSchema.safeParse({
        email: 'test@example.com',
        password: '12345678',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('SignupCredentialsSchema', () => {
    it('validates correct signup credentials with all fields', () => {
      const result = SignupCredentialsSchema.safeParse({
        email: 'newuser@example.com',
        password: 'securepass123',
        name: 'New User',
        metadata: { referrer: 'google' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('newuser@example.com');
        expect(result.data.name).toBe('New User');
        expect(result.data.metadata).toEqual({ referrer: 'google' });
      }
    });

    it('validates with only required fields', () => {
      const result = SignupCredentialsSchema.safeParse({
        email: 'newuser@example.com',
        password: 'securepass123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeUndefined();
        expect(result.data.metadata).toBeUndefined();
      }
    });

    it('rejects invalid email', () => {
      const result = SignupCredentialsSchema.safeParse({
        email: 'invalid',
        password: 'securepass123',
      });

      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = SignupCredentialsSchema.safeParse({
        email: 'newuser@example.com',
        password: 'short',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('SiteUserSchema', () => {
    it('validates a complete site user', () => {
      const result = SiteUserSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        siteId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        metadata: { role: 'admin' },
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result.success).toBe(true);
    });

    it('validates with optional fields omitted', () => {
      const result = SiteUserSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        siteId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'user@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toEqual({});
        expect(result.data.emailVerified).toBe(false);
      }
    });

    it('rejects invalid UUID for id', () => {
      const result = SiteUserSchema.safeParse({
        id: 'not-a-uuid',
        siteId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'user@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = SiteUserSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        siteId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'invalid-email',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid avatar URL', () => {
      const result = SiteUserSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        siteId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'user@example.com',
        avatarUrl: 'not-a-url',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result.success).toBe(false);
    });
  });

  describe('SiteRoleSchema', () => {
    it('validates a complete site role', () => {
      const result = SiteRoleSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        siteId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Admin',
        description: 'Full access administrator',
        permissions: ['content:read', 'content:create', 'admin:access'],
        isDefault: false,
        createdAt: new Date(),
      });

      expect(result.success).toBe(true);
    });

    it('validates with defaults applied', () => {
      const result = SiteRoleSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        siteId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Member',
        createdAt: new Date(),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.permissions).toEqual([]);
        expect(result.data.isDefault).toBe(false);
      }
    });

    it('rejects missing required name', () => {
      const result = SiteRoleSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        siteId: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: new Date(),
      });

      expect(result.success).toBe(false);
    });
  });

  describe('PERMISSIONS', () => {
    it('contains all expected content permissions', () => {
      expect(PERMISSIONS['content:read']).toBe('View content');
      expect(PERMISSIONS['content:create']).toBe('Create content');
      expect(PERMISSIONS['content:update']).toBe('Update content');
      expect(PERMISSIONS['content:delete']).toBe('Delete content');
    });

    it('contains all expected collection permissions', () => {
      expect(PERMISSIONS['collections:read']).toBe('View collections');
      expect(PERMISSIONS['collections:create']).toBe('Create records');
      expect(PERMISSIONS['collections:update']).toBe('Update records');
      expect(PERMISSIONS['collections:delete']).toBe('Delete records');
    });

    it('contains all expected order permissions', () => {
      expect(PERMISSIONS['orders:read']).toBe('View orders');
      expect(PERMISSIONS['orders:update']).toBe('Update orders');
    });

    it('contains all expected user permissions', () => {
      expect(PERMISSIONS['users:read']).toBe('View users');
      expect(PERMISSIONS['users:manage']).toBe('Manage users');
    });

    it('contains admin permission', () => {
      expect(PERMISSIONS['admin:access']).toBe('Access admin panel');
    });

    it('has all expected permissions defined', () => {
      expect(Object.keys(PERMISSIONS).length).toBeGreaterThanOrEqual(11);
      // Verify the key permissions exist
      expect(PERMISSIONS).toHaveProperty('content:read');
      expect(PERMISSIONS).toHaveProperty('admin:access');
    });
  });
});
