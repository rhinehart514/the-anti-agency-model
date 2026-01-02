# The Anti-Agency - Product Completion Checklist

> Last updated: 2026-01-01
> Status: MVP-ready / Soft-launch ready

## Legend
- [ ] Not started
- [~] In progress
- [x] Complete
- **P0** = Critical | **P1** = High | **P2** = Medium | **P3** = Low
- **S** = Small (< 2 hours) | **M** = Medium (2-8 hours) | **L** = Large (1-3 days)

---

## Phase 1: Critical Security (BLOCKING LAUNCH)

### Dependencies & Vulnerabilities
- [x] **S** Upgrade Next.js to 14.2.35+ (fixes 9 CVEs including critical) → `package.json`
- [x] **S** Fix qs vulnerability → `npm audit fix`

### Authentication & Authorization
- [x] **M** Add auth verification to GET `/api/sites/[siteId]/users` → `src/app/api/sites/[siteId]/users/route.ts`
- [x] **S** Add auth verification to product list endpoint → `src/app/api/sites/[siteId]/products/route.ts`
- [x] **M** Implement permission checks on user management operations → `src/app/api/sites/[siteId]/users/route.ts:67-155`

### Environment & Startup Validation
- [x] **M** Create env validation module → `src/lib/env.ts`
  - Validate STRIPE_WEBHOOK_SECRET, SUPABASE keys, GROQ_API_KEY at startup
  - Fail fast with clear error messages
- [x] **S** Remove non-null assertions, add proper checks → `src/middleware.ts:24-25`

### Rate Limiting
- [x] **M** Add rate limiter utility (Upstash or in-memory) → `src/lib/rate-limit.ts`
- [x] **S** Apply to login endpoint → `src/app/api/sites/[siteId]/auth/login/route.ts`
- [x] **S** Apply to signup endpoint → `src/app/api/sites/[siteId]/auth/signup/route.ts`
- [x] **S** Apply to checkout endpoint → `src/app/api/sites/[siteId]/checkout/route.ts`
- [x] **S** Apply to form submissions → `src/app/api/sites/[siteId]/forms/[formId]/submit/route.ts`

### Security Headers
- [x] **M** Add security headers middleware → `next.config.js`
  - Content-Security-Policy
  - Strict-Transport-Security
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy

### CORS
- [x] **S** Fix wildcard CORS on analytics (restrict to site domains) → `src/app/api/analytics/track/route.ts:76-84`

---

## Phase 2: Incomplete Features

### Email System
- [x] **M** Implement `sendInvitationEmail()` function → `src/lib/email/send.ts`
- [x] **S** Wire invitation email to site user creation → `src/app/api/sites/[siteId]/users/route.ts:130`
- [x] **S** Wire invitation email to org member creation → `src/app/api/organizations/[orgId]/members/route.ts:176`
- [x] **S** Implement payment failed notification email → `src/app/api/webhooks/stripe/route.ts:363`

### Tax Calculation (TaxJar Integration)
- [x] **L** Create TaxJar client → `src/lib/taxjar/client.ts`
- [x] **M** Implement address-based tax lookup → `src/lib/taxjar/calculate.ts`
- [x] **M** Integrate into checkout flow → `src/app/api/sites/[siteId]/checkout/route.ts:168`
- [x] **S** Add tax line item to order display
- [x] **S** Store tax nexus settings per site → `src/app/api/sites/[siteId]/tax-settings/route.ts`

### Workflow System Cleanup
- [x] **S** Remove `send_sms` action from workflow executor → `src/lib/workflows/executor.ts:90-105`
- [x] **S** Remove SMS from action type definitions → `src/lib/workflows/types.ts`
- [x] **P1 L** Implement job queue for long delays (>30s) → Bull + Redis
  - `src/lib/redis.ts` - Redis client
  - `src/lib/queue/workflow-queue.ts` - BullMQ queue setup
  - `src/lib/workflows/executor.ts` - Enqueue delays to Bull
- [x] **S** Verify `tasks` table exists or remove create_task action → `src/lib/workflows/executor.ts:430`
- [x] **S** Verify `notifications` table exists or remove action → `src/lib/workflows/executor.ts:465`

### Analytics Dashboard
- [x] **M** Create analytics aggregation endpoint → `src/app/api/sites/[siteId]/analytics/summary/route.ts`
- [x] **S** Wire page views to admin dashboard → `src/app/(admin)/admin/[siteId]/page.tsx:87`

---

## Phase 3: Missing API Endpoints

### Form & Contact Submissions
- [x] **M** GET `/api/sites/[siteId]/forms/[formId]/submissions` → View form responses
- [x] **M** GET `/api/sites/[siteId]/contact-submissions` → View contact entries
- [x] **S** Add pagination, filtering, status updates

### Commerce Management
- [x] **M** CRUD `/api/sites/[siteId]/discounts` → Discount code management
- [x] **M** CRUD `/api/sites/[siteId]/shipping-methods` → Shipping options
- [x] **M** CRUD `/api/sites/[siteId]/customers` → Customer management
- [x] **S** GET `/api/sites/[siteId]/payments` → Payment history view

### Workflow Visibility
- [x] **M** GET `/api/sites/[siteId]/workflows/[id]/executions` → Execution history

---

## Phase 4: Input Validation & Error Handling

### Zod Schema Validation
- [x] **M** Add request schemas to products route → `src/app/api/sites/[siteId]/products/route.ts`
- [x] **M** Add request schemas to users route → `src/app/api/sites/[siteId]/users/route.ts`
- [x] **M** Add request schemas to checkout route → `src/app/api/sites/[siteId]/checkout/route.ts`
- [x] **S** Add max pagination limit (100) to all list endpoints

### Error Handling
- [~] **L** Replace console.error with structured logger → `src/lib/logger.ts` (Pino)
  - Infrastructure complete: `src/lib/logger.ts` with module loggers
  - Updated: webhook, middleware, email, checkout (24/266 calls)
  - Remaining: 242 console.* calls across 61 files
- [ ] **M** Distinguish 400 (validation) vs 500 (server) errors → All routes
- [x] **S** Add request ID to all responses → `src/middleware.ts`

---

## Phase 5: Test Coverage

### Priority 1 - Payment (Financial Risk)
- [x] **L** Stripe client unit tests → `src/lib/stripe/__tests__/client.test.ts` (19 tests)
- [x] **L** Stripe webhook handler tests → `src/app/api/webhooks/stripe/__tests__/route.test.ts` (14 tests)
- [x] **L** Checkout flow integration tests → `src/app/api/sites/[siteId]/checkout/__tests__/route.test.ts` (18 tests)
- [x] **M** Order API tests → `src/app/api/sites/[siteId]/orders/__tests__/route.test.ts` (15 tests)

### Priority 2 - Data Integrity
- [x] **L** Workflow executor tests → `src/lib/workflows/__tests__/executor.test.ts` (33 tests)
- [x] **M** Collection CRUD tests → `src/app/api/sites/[siteId]/collections/__tests__/*.test.ts` (33 tests)
- [x] **M** Form submission tests → `src/app/api/sites/[siteId]/forms/[formId]/submit/__tests__/route.test.ts` (19 tests)

### Priority 3 - Security
- [x] **M** Site auth signup/login tests → `src/app/api/sites/[siteId]/auth/*/route.test.ts` (22 tests)
- [x] **M** Site creation tests (slug validation, duplicates) → 13 tests
- [x] **S** Site-auth library tests → `src/lib/site-auth/__tests__/types.test.ts` (24 tests)

### Priority 4 - E2E User Flows
- [ ] **L** Full signup → site creation → publish flow
- [ ] **L** Product add → cart → checkout → payment flow
- [ ] **M** Form creation → submission → notification flow

---

## Phase 6: Infrastructure

### Developer Experience
- [x] **S** Create `.eslintrc.json` with strict rules
- [x] **S** Add pre-commit hooks (lint, type-check)

### Performance & Reliability
- [x] **P3 M** Add DNS caching in middleware → `src/middleware.ts` (in-memory, 5-min TTL)
- [x] **S** Add health check endpoint → `/api/health`

### Observability
- [x] **P1 M** Configure Sentry error tracking → `sentry.*.config.ts`
- [~] **P1 L** Add structured logging (Pino) → `src/lib/logger.ts` (infrastructure complete)
- [x] **S** Add request tracing IDs → `src/middleware.ts` (via nanoid)

### Deployment
- [ ] **P3 S** Configure CDN for static assets → `next.config.js`
- [x] **P3 S** Document deployment process → `DEPLOYMENT.md`

---

## Phase 7: Documentation

- [ ] **P3 L** OpenAPI spec (JSDoc + swagger-jsdoc) → All 32 API routes + `/api/docs`
- [x] **P3 S** Environment variable reference → `docs/environment-variables.md`
- [ ] **P3 S** Architecture decision records → `docs/adr/` (6 ADRs)
- [x] **P3 M** Contributor setup guide → `CONTRIBUTING.md`

---

## Tracking

| Phase | Total | Done | Remaining | Progress |
|-------|-------|------|-----------|----------|
| 1. Security | 14 | 14 | 0 | ✅ 100% |
| 2. Features | 16 | 16 | 0 | ✅ 100% |
| 3. APIs | 8 | 8 | 0 | ✅ 100% |
| 4. Validation | 7 | 5 | 2 | 71% |
| 5. Tests | 13 | 10 | 3 | 77% |
| 6. Infra | 9 | 7 | 2 | 78% |
| 7. Docs | 4 | 2 | 2 | 50% |
| **TOTAL** | **71** | **62** | **9** | **87%** |

### Estimated Time to 100%: ~115-155 hours

### What's Complete (Production-Ready)
- ✅ All critical security (auth, rate limiting, headers, CORS, validation)
- ✅ All API endpoints (32 routes fully functional)
- ✅ Full commerce platform (products, cart, Stripe, orders)
- ✅ Forms & collections with submissions
- ✅ Workflow automation engine
- ✅ Email system (8 templates)
- ✅ Analytics tracking
- ✅ Custom domain support

### Remaining Items by Priority

**P1 - High Priority (Production Hardening)**
- [~] Structured logging (Pino) - 8-12h (infrastructure done, key routes updated)
- [ ] Error code standardization (400 vs 500) - 4-6h
- [x] Job queue for workflow delays (BullMQ + Redis) - 12-16h ✅
- [x] Sentry error tracking - 2-3h ✅

**P2 - Medium Priority (Test Coverage)**
- [x] Site creation tests - 3-5h ✅
- [x] Order API tests - 4-6h ✅
- [x] Form submission tests - 4-6h ✅
- [x] Collection CRUD tests - 6-8h ✅
- [x] Workflow executor tests (33 tests) - 12-16h ✅
- [ ] E2E test flows (3 scenarios) - 13-18h

**P3 - Low Priority (Documentation & Polish)**
- [x] Tax nexus settings per site - 2-4h ✅
- [x] DNS caching in middleware - 2-3h ✅
- [ ] CDN configuration - 1-2h
- [ ] OpenAPI spec (JSDoc + swagger-jsdoc) - 8-10h
- [ ] Architecture Decision Records - 3-4h
- [x] Contributor guide - 2-3h ✅
- [x] Deployment docs - 2-3h ✅
- [x] Environment variable reference - 1h ✅

### Test Summary (315 tests across 18 files)
- Stripe Client: 19 tests
- Stripe Webhook: 14 tests
- Checkout Flow: 18 tests
- Order API: 15 tests
- Site Creation: 13 tests
- Site Auth Login: 10 tests
- Site Auth Signup: 12 tests
- Site Auth Types: 24 tests
- Form Submission: 19 tests
- Collections: 11 tests
- Collection Records: 22 tests
- Workflow Executor: 33 tests
- UI Components: 30 tests (button, input, badge)
- Email Templates: 49 tests
- Utilities: 7 tests
- Theme Presets: 19 tests
