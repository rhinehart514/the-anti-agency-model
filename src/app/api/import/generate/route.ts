import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSiteFromScraped } from '@/lib/content/generate-from-scraped';
import type { ScrapedSiteData } from '@/lib/scraping/types';
import { logger } from '@/lib/logger';

const GenerateRequestSchema = z.object({
  scraped: z.object({
    url: z.string().url(),
    platform: z.string(),
    business: z.object({
      name: z.string().nullable(),
      tagline: z.string().nullable(),
      description: z.string().nullable(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
      address: z.string().nullable(),
      hours: z.string().nullable(),
    }),
    content: z.object({
      heroText: z.string().nullable(),
      heroSubtext: z.string().nullable(),
      aboutText: z.string().nullable(),
      services: z.array(z.string()),
      testimonials: z.array(z.object({
        text: z.string(),
        author: z.string().optional(),
        role: z.string().optional(),
        company: z.string().optional(),
      })),
      features: z.array(z.object({
        title: z.string(),
        description: z.string(),
      })),
      ctaText: z.string().nullable(),
    }),
    assets: z.object({
      logo: z.string().nullable(),
      favicon: z.string().nullable(),
      heroImage: z.string().nullable(),
      images: z.array(z.string()),
      videos: z.array(z.string()),
    }),
    seo: z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      keywords: z.array(z.string()),
      ogImage: z.string().nullable(),
      canonicalUrl: z.string().nullable(),
    }),
    social: z.record(z.string()).optional(),
    pages: z.array(z.any()).optional(),
    scrapedAt: z.string().transform(s => new Date(s)),
    scrapeErrors: z.array(z.string()).optional(),
  }),
  options: z.object({
    style: z.enum(['modern', 'classic', 'bold', 'minimal']).optional(),
    colorScheme: z.string().optional(),
    industry: z.string().optional(),
    tone: z.enum(['professional', 'friendly', 'bold', 'traditional']).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { scraped, options } = parsed.data;

    logger.info({ url: scraped.url }, 'Starting content generation');

    const startTime = Date.now();

    // Generate improved content
    const result = await generateSiteFromScraped(
      scraped as unknown as ScrapedSiteData,
      options
    );

    const duration = Date.now() - startTime;

    logger.info(
      { url: scraped.url, duration, model: result.metadata.model },
      'Content generation completed'
    );

    return NextResponse.json({
      success: true,
      data: result,
      duration,
    });
  } catch (error) {
    logger.error({ error }, 'Generate endpoint error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
