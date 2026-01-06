# Deployment Guide

This guide covers deploying Cursor for Normies to production.

## Supported Platforms

- **Vercel** (recommended) - Zero-config Next.js deployment
- **Railway** - Container-based deployment
- **Self-hosted** - Any Node.js hosting

## Prerequisites

Before deploying, ensure you have:

1. **Supabase project** (production instance)
2. **Stripe account** with production API keys
3. **Resend account** for transactional email
4. **Domain name** (optional but recommended)

## Environment Variables

Set these in your deployment platform:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Commerce
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email
RESEND_API_KEY=re_...

# AI (optional)
GROQ_API_KEY=gsk_...

# Tax (optional)
TAXJAR_API_KEY=...

# App config
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Select "Next.js" as framework preset

### 2. Configure Environment Variables

In Project Settings → Environment Variables, add all variables from above.

### 3. Configure Build Settings

Default settings should work:
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 4. Deploy

Click "Deploy" - Vercel handles the rest.

### 5. Set Up Webhooks

After deployment, configure Stripe webhook:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

## Database Setup

### 1. Create Production Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project (production region)
3. Wait for project to initialize

### 2. Run Schema Migration

1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `supabase/schema.sql`
3. Execute the SQL

### 3. Configure Row Level Security

RLS is already configured in the schema. Verify policies are active:

```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

### 4. Enable Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Custom Domain Setup

### 1. Add Domain in Vercel

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS as instructed

### 2. Configure for Multi-tenant

The middleware handles custom domain routing. Ensure:

1. Sites have domains configured in `site_domains` table
2. DNS points to your Vercel deployment

```sql
-- Example: Add custom domain
INSERT INTO site_domains (domain, site_id, verified)
VALUES ('client-site.com', 'site-uuid', true);
```

## Post-Deployment Checklist

### Security

- [ ] All environment variables are production values
- [ ] Stripe keys are live (not test) keys
- [ ] `NODE_ENV` is set to `production`
- [ ] HTTPS is enforced (automatic on Vercel)

### Functionality

- [ ] Homepage loads correctly
- [ ] Site builder works
- [ ] Commerce checkout processes payments
- [ ] Emails are being sent
- [ ] Custom domains resolve correctly

### Monitoring

- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation

## Troubleshooting

### Build Fails

Check:
- All required environment variables are set
- Node.js version matches (18.x or higher)
- No TypeScript errors (`npm run type-check`)

### Database Connection Issues

Verify:
- Supabase URL is correct
- Service role key has proper permissions
- IP allowlist includes your deployment (Supabase → Settings → Database)

### Stripe Webhooks Not Working

Check:
- Webhook URL is correct
- Webhook secret matches environment variable
- Events are configured correctly
- Verify in Stripe Dashboard → Webhooks → Recent attempts

### Email Not Sending

Verify:
- Resend API key is correct
- Domain is verified in Resend
- Check Resend dashboard for delivery logs

## Scaling Considerations

### Current Architecture

- **Single server** deployment
- **In-memory** rate limiting
- **Supabase** handles database scaling

### For Higher Scale

Consider adding:

1. **Redis** for distributed rate limiting and caching
2. **CDN** for static assets (Vercel handles this)
3. **Database read replicas** for heavy read loads
4. **Job queue** (Bull + Redis) for background tasks

## Rollback

### Vercel

1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Database

Always backup before migrations:

```sql
-- Export data before changes
pg_dump -h your-host -U postgres -d postgres > backup.sql
```

## Support

For deployment issues:
- Check Vercel/platform documentation
- Review application logs
- Open an issue in the repository
