import { z } from 'zod';

// Site User Schema
export const SiteUserSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).default({}),
  emailVerified: z.boolean().default(false),
  emailVerifiedAt: z.date().optional(),
  lastLoginAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SiteUser = z.infer<typeof SiteUserSchema>;

// Site Role Schema
export const SiteRoleSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  createdAt: z.date(),
});

export type SiteRole = z.infer<typeof SiteRoleSchema>;

// Permission types
export const PERMISSIONS = {
  // Content
  'content:read': 'View content',
  'content:create': 'Create content',
  'content:update': 'Update content',
  'content:delete': 'Delete content',

  // Collections
  'collections:read': 'View collections',
  'collections:create': 'Create records',
  'collections:update': 'Update records',
  'collections:delete': 'Delete records',

  // Orders
  'orders:read': 'View orders',
  'orders:update': 'Update orders',

  // Users
  'users:read': 'View users',
  'users:manage': 'Manage users',

  // Admin
  'admin:access': 'Access admin panel',
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Auth Credentials
export const LoginCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

export const SignupCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SignupCredentials = z.infer<typeof SignupCredentialsSchema>;

// Session
export interface SiteSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  user: SiteUser;
  roles: SiteRole[];
}

// Auth Context
export interface SiteAuthContext {
  user: SiteUser | null;
  session: SiteSession | null;
  roles: SiteRole[];
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (roleName: string) => boolean;
}
