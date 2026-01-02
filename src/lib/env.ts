/**
 * Environment variable validation
 * Validates required env vars at startup and provides typed access
 */

import { z } from 'zod'

const envSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Stripe (required for commerce)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_').optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_').optional(),

  // Groq AI (optional - degrades gracefully)
  GROQ_API_KEY: z.string().optional(),

  // Resend Email (optional - degrades gracefully)
  RESEND_API_KEY: z.string().optional(),

  // TaxJar (optional - for tax calculation)
  TAXJAR_API_KEY: z.string().optional(),

  // App Config
  NEXT_PUBLIC_APP_DOMAIN: z.string().optional().default('localhost:3000'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>

let validatedEnv: Env | null = null

/**
 * Validates environment variables and returns typed config
 * Throws on first call if required vars are missing
 * Caches result for subsequent calls
 */
export function getEnv(): Env {
  if (validatedEnv) {
    return validatedEnv
  }

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    console.error('\n========================================')
    console.error('ENVIRONMENT VALIDATION FAILED')
    console.error('========================================')
    console.error('Missing or invalid environment variables:\n')
    console.error(errors)
    console.error('\n========================================\n')

    // In development or during build, continue with warnings
    // In production runtime, fail fast
    const isBuilding = process.env.NEXT_PHASE === 'phase-production-build'
    if (process.env.NODE_ENV === 'production' && !isBuilding) {
      throw new Error(`Environment validation failed:\n${errors}`)
    }
  }

  // Use validated values or fall back to process.env with defaults
  validatedEnv = result.success ? result.data : {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    TAXJAR_API_KEY: process.env.TAXJAR_API_KEY,
    NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  }

  return validatedEnv
}

/**
 * Check if a specific feature is enabled based on env vars
 */
export const features = {
  get stripe(): boolean {
    const env = getEnv()
    return !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
  },

  get email(): boolean {
    return !!getEnv().RESEND_API_KEY
  },

  get ai(): boolean {
    return !!getEnv().GROQ_API_KEY
  },

  get taxjar(): boolean {
    return !!getEnv().TAXJAR_API_KEY
  },
}

/**
 * Validate env on module load in production (but not during build)
 * NEXT_PHASE is set during build to 'phase-production-build'
 */
const isBuilding = process.env.NEXT_PHASE === 'phase-production-build'
if (process.env.NODE_ENV === 'production' && !isBuilding) {
  getEnv()
}
