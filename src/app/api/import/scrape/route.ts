import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeUrl } from '@/lib/scraping';
import { loggers } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { withRateLimit, rateLimiters } from '@/lib/rate-limit';
import { requireAuth, validateExternalUrl } from '@/lib/api-security';

// Stricter rate limit for expensive scraping operations
const SCRAPE_RATE_LIMIT = { limit: 5, windowSeconds: 60, identifier: 'scrape' };

const ScrapeRequestSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  options: z.object({
    timeout: z.number().min(5000).max(60000).optional(),
    maxPages: z.number().min(1).max(10).optional(),
    followLinks: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (stricter for expensive scraping operations)
    const rateLimit = withRateLimit(request, SCRAPE_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    // Require authentication
    const supabase = await createClient();
    const auth = await requireAuth(supabase);

    const body = await request.json();
    const parsed = ScrapeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url, options } = parsed.data;

    // SSRF Protection - validate URL is not pointing to internal network
    const urlValidation = validateExternalUrl(url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    loggers.import.info({ url, userId: auth.userId }, 'Starting URL scrape');

    // Perform the scrape
    const result = await scrapeUrl(url, {
      timeout: options?.timeout || 30000,
      maxPages: options?.maxPages || 1,
      followLinks: options?.followLinks || false,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          error: 'Failed to scrape URL',
          details: result.errors,
        },
        { status: 422 }
      );
    }

    loggers.import.info({ url, userId: auth.userId }, 'Scrape completed');

    return NextResponse.json({
      success: true,
      data: result.data,
      duration: result.duration,
      errors: result.errors,
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    loggers.import.error({ error }, 'Scrape endpoint error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
