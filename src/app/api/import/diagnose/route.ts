import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeSite } from '@/lib/diagnosis';
import { logger } from '@/lib/logger';

const DiagnoseRequestSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  html: z.string().min(100, 'HTML content is required'),
  options: z.object({
    skipCategories: z.array(z.enum([
      'performance',
      'mobile',
      'seo',
      'conversion',
      'accessibility',
      'security',
    ])).optional(),
    detailed: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = DiagnoseRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url, html, options } = parsed.data;

    logger.info({ url }, 'Starting site diagnosis');

    const startTime = Date.now();
    const result = await analyzeSite(url, html, options);
    const duration = Date.now() - startTime;

    logger.info(
      { url, score: result.overallScore, duration },
      'Diagnosis completed'
    );

    return NextResponse.json({
      success: true,
      data: result,
      duration,
    });
  } catch (error) {
    logger.error({ error }, 'Diagnose endpoint error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
