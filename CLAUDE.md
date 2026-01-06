# Cursor for Normies - Project Context

## What Is This?

**Cursor for Normies** is a full-featured, AI-powered website builder platform. Users can create and edit professional websites using natural language - no coding, no agency fees, no complicated tools.

**Core value prop:** "Your website, always current" - AI-assisted content and maintenance.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14.2 (App Router, React 18) |
| Language | TypeScript 5.4 (strict mode) |
| Styling | Tailwind CSS 3.4 + Shadcn/ui + Radix |
| Database | Supabase (PostgreSQL + RLS) |
| Payments | Stripe |
| AI | Groq SDK (Llama 3.3 70B) |
| Email | Resend |
| Editor | Tiptap 2.6 |
| Testing | Vitest + Playwright |

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/           # Admin routes
│   ├── (auth)/            # Auth routes
│   ├── (checkout)/        # Checkout flow
│   ├── api/               # 32 API endpoints
│   ├── builder/           # Site builder UI
│   ├── dashboard/         # User dashboard
│   ├── setup/             # Onboarding wizard
│   └── sites/[siteSlug]/  # Published site rendering
├── components/
│   ├── ui/                # Shadcn components
│   ├── builder/           # Builder interface
│   ├── editor/            # Content editor
│   ├── sections/          # Pre-built sections (hero, features, etc.)
│   ├── commerce/          # Shopping cart UI
│   ├── forms/             # Form builder
│   └── collections/       # Data management
├── lib/                   # Business logic
│   ├── ai/                # Groq client & prompts
│   ├── commerce/          # Product/order logic
│   ├── forms/             # Form handling
│   ├── workflows/         # Automation engine
│   ├── collections/       # Data collections
│   ├── supabase/          # DB client
│   ├── stripe/            # Payment integration
│   └── email/             # Email templates
├── types/                 # Global types
└── hooks/                 # React hooks
```

## Database Schema (Key Tables)

**Core:** `sites`, `pages`, `content_versions`, `contact_submissions`

**Users:** `site_users`, `site_roles`, `site_user_roles`, `site_sessions`

**Collections:** `data_collections`, `collection_fields`, `collection_records`, `collection_views`

**Forms:** `forms`, `form_fields`, `form_submissions`

**Workflows:** `workflows`, `workflow_steps`, `workflow_executions`

**Commerce:** `products`, `product_variants`, `product_categories`, `shopping_carts`, `orders`, `order_items`

**Infra:** `site_domains`, `organizations`, `analytics_events`

## Key Features

- **Site Builder:** Drag-and-drop with template library
- **Commerce:** Full e-commerce (products, cart, Stripe checkout, orders)
- **Forms:** Configurable form builder with submission tracking
- **Collections:** Airtable-like data management with multiple view types
- **Workflows:** Automation engine (triggers → actions)
- **Custom Domains:** DNS verification and routing
- **AI Content:** Groq-powered content generation/rewriting
- **Analytics:** Event tracking and page views

## API Patterns

All API routes follow REST conventions:
- `GET/POST /api/sites` - List/create
- `GET/PATCH/DELETE /api/sites/[id]` - CRUD operations
- Nested resources: `/api/sites/[siteId]/products`, `/api/sites/[siteId]/orders`, etc.

## Development Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

## Testing

- **Unit:** Vitest with React Testing Library
- **E2E:** Playwright (Chromium)
- **Coverage:** 50% statements, 40% branches target
- **A11y:** Axe integration in Playwright

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
```

## Architectural Decisions

1. **Supabase over Firebase:** PostgreSQL with RLS for complex relational data
2. **Groq over OpenAI:** Free tier, fast inference for content generation
3. **JSONB for pages:** Flexible content storage without migrations
4. **Dual auth system:** Builder auth (Supabase) vs. site-user auth (custom)
5. **Custom domain middleware:** Routes custom domains to site instances

## Project-Specific Conventions

### File Naming
- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Types: `types.ts` or `*.types.ts`
- Tests: `*.test.ts(x)`

### Import Order
1. React/Next imports
2. Third-party packages
3. `@/lib/*` utilities
4. `@/components/*`
5. `@/types/*`
6. Relative imports

### API Route Pattern
```typescript
export async function GET(request: Request) {
  try {
    // Validate auth
    // Parse params
    // Business logic
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: message }, { status: code })
  }
}
```

### Component Pattern
```typescript
interface Props {
  // Required props first
  // Optional props with defaults
}

export function ComponentName({ prop1, prop2 = default }: Props) {
  // Hooks at top
  // Derived state
  // Event handlers
  // Return JSX
}
```

## Current State (Dec 2025)

**Complete:**
- Site builder with drag-and-drop
- Template library with sections
- Full commerce platform
- Form builder with submissions
- Data collections (Airtable-like)
- Workflow automation engine
- Custom domain support
- File uploads
- Email via Resend
- Stripe payments
- Analytics tracking
- Testing infrastructure

**In Progress:**
- AI content refinement
- Advanced workflow execution
- E2E test expansion

## Known Gaps

1. No rate limiting on API routes
2. No Redis/caching layer
3. No full-text search
4. Limited structured logging
5. Basic CDN setup

## When Working in This Codebase

1. **Check existing patterns first** - This is a mature codebase with established conventions
2. **Use existing components** - Check `src/components/ui/` before creating new UI
3. **Follow the type system** - Types are in `src/types/` and colocated `*.types.ts`
4. **Test your changes** - Run `npm run test` before committing
5. **Use the commerce/forms/workflows libs** - Don't reinvent existing logic
6. **Respect RLS policies** - Database security is at the Supabase level
