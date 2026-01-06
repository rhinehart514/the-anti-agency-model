# Environment Variables Reference

This document describes all environment variables used by Cursor for Normies.

## Quick Start

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

## Required Variables

### Supabase (Database & Auth)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key for client-side access | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side admin operations | `eyJhbGciOiJIUzI1NiIs...` |

**Where to find:** Supabase Dashboard → Settings → API

## Optional Variables (Feature Flags)

The platform gracefully degrades when optional services are not configured.

### Stripe (Commerce)

Enables: Product purchases, checkout, order management

| Variable | Description | Format |
|----------|-------------|--------|
| `STRIPE_SECRET_KEY` | Server-side API key | Must start with `sk_` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Must start with `whsec_` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side publishable key | Must start with `pk_` |

**Where to find:** Stripe Dashboard → Developers → API keys

**Webhook setup:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed`

### Groq AI (Content Generation)

Enables: AI-powered content generation, rewriting, suggestions

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for Llama 3.3 70B |

**Where to find:** [console.groq.com](https://console.groq.com) → API Keys

### Resend (Email)

Enables: Transactional emails (order confirmations, invitations, notifications)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key | Must start with `re_` |

**Where to find:** [resend.com/api-keys](https://resend.com/api-keys)

**Email templates available:**
- Order confirmation
- Form submission notification
- Welcome email
- Password reset
- Workflow notification
- Shipping notification
- Invitation email
- Payment failed notification

### TaxJar (Tax Calculation)

Enables: Automatic sales tax calculation based on shipping address

| Variable | Description |
|----------|-------------|
| `TAXJAR_API_KEY` | TaxJar API key |

**Where to find:** TaxJar Dashboard → Account → API Access

**Note:** Uses sandbox API in development, production API in production.

## App Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_DOMAIN` | Your app's domain | `localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Full URL for the app | (derived from domain) |
| `NODE_ENV` | Environment mode | `development` |

## Feature Detection

The app automatically detects which features are available based on configured variables:

```typescript
import { features } from '@/lib/env';

if (features.stripe) {
  // Commerce is enabled
}

if (features.email) {
  // Email notifications are enabled
}

if (features.ai) {
  // AI content generation is enabled
}

if (features.taxjar) {
  // Tax calculation is enabled
}
```

## Validation

Environment variables are validated at startup using Zod schemas. In production, the app will fail fast if required variables are missing. In development, it will log warnings but continue.

Validation logic: `src/lib/env.ts`

## Example .env.local

```bash
# ===================
# REQUIRED
# ===================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ===================
# COMMERCE (Optional)
# ===================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ===================
# AI (Optional)
# ===================
GROQ_API_KEY=gsk_...

# ===================
# EMAIL (Optional)
# ===================
RESEND_API_KEY=re_...

# ===================
# TAX (Optional)
# ===================
TAXJAR_API_KEY=...

# ===================
# APP CONFIG
# ===================
NEXT_PUBLIC_APP_DOMAIN=localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Production Checklist

Before deploying to production:

- [ ] All required Supabase variables are set
- [ ] Stripe keys are production keys (not test keys)
- [ ] Webhook secrets are configured for production endpoint
- [ ] `NODE_ENV` is set to `production`
- [ ] `NEXT_PUBLIC_APP_DOMAIN` and `NEXT_PUBLIC_APP_URL` point to production domain
