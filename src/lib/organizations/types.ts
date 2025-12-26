import { z } from 'zod';

// ============================================
// ORGANIZATIONS
// ============================================

// Organization Role
export const OrgRoleEnum = z.enum(['owner', 'admin', 'member', 'viewer']);
export type OrgRole = z.infer<typeof OrgRoleEnum>;

// Organization Settings
export const OrganizationSettingsSchema = z.object({
  // Branding
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z.string().default('#3b82f6'),
  secondaryColor: z.string().default('#64748b'),

  // Features
  allowCustomDomains: z.boolean().default(true),
  allowWhiteLabel: z.boolean().default(false),

  // Defaults for new sites
  defaultThemeId: z.string().uuid().optional(),
  defaultTemplateId: z.string().uuid().optional(),

  // Email
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),

  // Support
  supportEmail: z.string().email().optional(),
  supportUrl: z.string().url().optional(),
});

export type OrganizationSettings = z.infer<typeof OrganizationSettingsSchema>;

// Organization Schema
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().default('#3b82f6'),
  secondaryColor: z.string().default('#64748b'),
  customDomain: z.string().optional(),
  settings: OrganizationSettingsSchema.default({}),
  billingEmail: z.string().email().optional(),
  ownerId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// Organization Member
export const OrganizationMemberSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: OrgRoleEnum,
  permissions: z.array(z.string()).default([]),
  invitedAt: z.date(),
  joinedAt: z.date().optional(),
});

export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;

// Organization Invite
export const OrganizationInviteSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: OrgRoleEnum.default('member'),
  token: z.string(),
  expiresAt: z.date(),
  createdBy: z.string().uuid().optional(),
  createdAt: z.date(),
});

export type OrganizationInvite = z.infer<typeof OrganizationInviteSchema>;

// ============================================
// BILLING
// ============================================

// Plan Types
export const PlanEnum = z.enum(['free', 'starter', 'pro', 'agency', 'enterprise']);
export type Plan = z.infer<typeof PlanEnum>;

// Billing Status
export const BillingStatusEnum = z.enum(['active', 'past_due', 'cancelled', 'trialing']);
export type BillingStatus = z.infer<typeof BillingStatusEnum>;

// Plan Limits
export const PLAN_LIMITS: Record<Plan, {
  sites: number;
  members: number;
  storageGb: number;
  monthlyPageViews: number;
  customDomains: boolean;
  whiteLabel: boolean;
  prioritySupport: boolean;
  api: boolean;
}> = {
  free: {
    sites: 1,
    members: 1,
    storageGb: 1,
    monthlyPageViews: 10000,
    customDomains: false,
    whiteLabel: false,
    prioritySupport: false,
    api: false,
  },
  starter: {
    sites: 3,
    members: 2,
    storageGb: 5,
    monthlyPageViews: 50000,
    customDomains: true,
    whiteLabel: false,
    prioritySupport: false,
    api: true,
  },
  pro: {
    sites: 10,
    members: 5,
    storageGb: 25,
    monthlyPageViews: 250000,
    customDomains: true,
    whiteLabel: false,
    prioritySupport: true,
    api: true,
  },
  agency: {
    sites: 50,
    members: 20,
    storageGb: 100,
    monthlyPageViews: 1000000,
    customDomains: true,
    whiteLabel: true,
    prioritySupport: true,
    api: true,
  },
  enterprise: {
    sites: Infinity,
    members: Infinity,
    storageGb: Infinity,
    monthlyPageViews: Infinity,
    customDomains: true,
    whiteLabel: true,
    prioritySupport: true,
    api: true,
  },
};

// Organization Billing
export const OrganizationBillingSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  plan: PlanEnum.default('free'),
  status: BillingStatusEnum.default('active'),
  trialEndsAt: z.date().optional(),
  currentPeriodStart: z.date().optional(),
  currentPeriodEnd: z.date().optional(),
  sitesLimit: z.number().default(1),
  membersLimit: z.number().default(1),
  storageLimitGb: z.number().default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type OrganizationBilling = z.infer<typeof OrganizationBillingSchema>;

// ============================================
// TEMPLATES
// ============================================

// Site Template
export const SiteTemplateSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  pages: z.array(z.record(z.unknown())).default([]),
  themeId: z.string().uuid().optional(),
  isPublic: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  price: z.number().optional(),
  installsCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SiteTemplate = z.infer<typeof SiteTemplateSchema>;

// ============================================
// USAGE TRACKING
// ============================================

export const UsageMetricEnum = z.enum([
  'page_views',
  'api_requests',
  'storage_bytes',
  'bandwidth_bytes',
  'form_submissions',
  'email_sends',
  'workflow_runs',
]);

export type UsageMetric = z.infer<typeof UsageMetricEnum>;

export const UsageRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  metric: UsageMetricEnum,
  value: z.number().default(0),
  periodStart: z.date(),
  periodEnd: z.date(),
  createdAt: z.date(),
});

export type UsageRecord = z.infer<typeof UsageRecordSchema>;

// Usage Summary
export interface UsageSummary {
  metric: UsageMetric;
  current: number;
  limit: number;
  percentage: number;
}

// ============================================
// PERMISSIONS
// ============================================

export const ORG_PERMISSIONS = {
  // Sites
  'sites:view': 'View sites',
  'sites:create': 'Create sites',
  'sites:edit': 'Edit sites',
  'sites:delete': 'Delete sites',
  'sites:publish': 'Publish sites',

  // Members
  'members:view': 'View members',
  'members:invite': 'Invite members',
  'members:remove': 'Remove members',
  'members:edit_roles': 'Edit member roles',

  // Billing
  'billing:view': 'View billing',
  'billing:manage': 'Manage billing',

  // Settings
  'settings:view': 'View settings',
  'settings:edit': 'Edit settings',

  // Templates
  'templates:view': 'View templates',
  'templates:create': 'Create templates',
  'templates:edit': 'Edit templates',
  'templates:delete': 'Delete templates',
} as const;

export type OrgPermission = keyof typeof ORG_PERMISSIONS;

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
  owner: Object.keys(ORG_PERMISSIONS) as OrgPermission[],
  admin: [
    'sites:view', 'sites:create', 'sites:edit', 'sites:delete', 'sites:publish',
    'members:view', 'members:invite',
    'billing:view',
    'settings:view', 'settings:edit',
    'templates:view', 'templates:create', 'templates:edit', 'templates:delete',
  ],
  member: [
    'sites:view', 'sites:create', 'sites:edit', 'sites:publish',
    'members:view',
    'settings:view',
    'templates:view',
  ],
  viewer: [
    'sites:view',
    'members:view',
    'settings:view',
    'templates:view',
  ],
};
