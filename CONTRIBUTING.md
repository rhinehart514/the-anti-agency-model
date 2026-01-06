# Contributing to Cursor for Normies

Thank you for your interest in contributing! This guide will help you get set up and understand our development workflow.

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Git**
- A code editor (VS Code recommended)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/cursor-for-normies.git
cd cursor-for-normies
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials. See [docs/environment-variables.md](./docs/environment-variables.md) for details.

**Minimum required for local development:**
- Supabase project (free tier works)
- Other services are optional and the app degrades gracefully

### 4. Set Up Database

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema: Copy `supabase/schema.sql` into SQL Editor and execute
3. Update `.env.local` with your Supabase credentials

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

We follow conventional commits:

```
type(scope): description

feat(commerce): add discount code validation
fix(auth): handle expired session tokens
docs(api): update checkout endpoint docs
refactor(workflows): simplify executor logic
test(forms): add submission validation tests
```

### Pre-commit Hooks

We use Husky for pre-commit hooks that run:
- ESLint with auto-fix
- TypeScript type checking

These run automatically on commit. To run manually:

```bash
npm run lint
npm run type-check
```

## Code Style

### TypeScript

- Strict mode enabled
- Use explicit types for function parameters and returns
- Prefer `interface` over `type` for object shapes
- Use `const` assertions for literal types

### File Organization

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components
│   ├── ui/        # Base UI components (Shadcn)
│   └── [feature]/ # Feature-specific components
├── lib/           # Business logic and utilities
├── hooks/         # React hooks
└── types/         # TypeScript type definitions
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProductCard.tsx` |
| Utilities | kebab-case | `format-currency.ts` |
| Types | PascalCase | `interface Product {}` |
| Constants | SCREAMING_SNAKE | `const MAX_ITEMS = 100` |
| Hooks | camelCase with `use` | `useProducts.ts` |

### Import Order

```typescript
// 1. React/Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party packages
import { z } from 'zod';

// 3. Internal utilities (@/lib)
import { formatCurrency } from '@/lib/utils';

// 4. Components (@/components)
import { Button } from '@/components/ui/button';

// 5. Types (@/types)
import type { Product } from '@/types';

// 6. Relative imports
import { ProductCard } from './ProductCard';
```

## Testing

### Running Tests

```bash
# Unit tests (watch mode)
npm run test

# Unit tests (single run)
npm run test:run

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests (headed, visible browser)
npm run test:e2e:headed

# All tests
npm run test:all
```

### Writing Tests

- Place unit tests next to the code: `Component.tsx` → `Component.test.tsx`
- Or in `__tests__/` directories for API routes
- Use meaningful test descriptions
- Test both happy paths and error cases

```typescript
describe('ProductCard', () => {
  it('renders product name and price', () => {
    // ...
  });

  it('shows out of stock badge when inventory is 0', () => {
    // ...
  });
});
```

### Coverage Targets

| Metric | Target |
|--------|--------|
| Statements | 50% |
| Branches | 40% |
| Functions | 50% |
| Lines | 50% |

## API Development

### Route Pattern

```typescript
// src/app/api/sites/[siteId]/products/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/api-errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const requestId = request.headers.get('x-request-id') || undefined;

  try {
    const supabase = await createClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    // Business logic
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('site_id', siteId);

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
```

### Error Handling

Use the error classes from `@/lib/api-errors`:

```typescript
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  handleApiError
} from '@/lib/api-errors';

// In your route
throw new ValidationError('Invalid email format');
throw new UnauthorizedError();
throw new NotFoundError('Product');
```

## Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear, atomic commits
3. **Write/update tests** for your changes
4. **Run the test suite** locally
5. **Push and open a PR** with a clear description
6. **Address review feedback**
7. **Squash and merge** once approved

### PR Description Template

```markdown
## Summary
Brief description of changes

## Changes
- Added X
- Fixed Y
- Updated Z

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manually tested feature

## Screenshots (if UI changes)
```

## Getting Help

- Check existing issues and discussions
- Review the codebase documentation in `CLAUDE.md`
- Ask questions in PR comments

## Code of Conduct

Be respectful and constructive. We're all here to build something great together.
