import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { PageContentSchema } from '@/lib/content/types';

const CreateSiteRequestSchema = z.object({
  // Site details
  name: z.string().min(1, 'Site name is required'),
  slug: z.string().min(1, 'Site slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),

  // Generated content
  content: PageContentSchema,

  // Import metadata
  importData: z.object({
    sourceUrl: z.string().url(),
    sourcePlatform: z.string(),
    scrapedData: z.any().optional(),
  }),

  // Optional customizations
  colorScheme: z.string().optional(),
  industry: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CreateSiteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, slug, content, importData, colorScheme, industry } = parsed.data;

    logger.info({ userId: user.id, name, slug }, 'Creating site from import');

    // Check if slug is already taken
    const { data: existingSite } = await supabase
      .from('sites')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSite) {
      return NextResponse.json(
        { error: 'Site slug already exists', field: 'slug' },
        { status: 409 }
      );
    }

    // Create the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        name,
        slug,
        owner_id: user.id,
        settings: {
          colorScheme: colorScheme || 'default',
          industry: industry || null,
          importedFrom: importData.sourceUrl,
          importedPlatform: importData.sourcePlatform,
        },
      })
      .select()
      .single();

    if (siteError) {
      logger.error({ error: siteError }, 'Failed to create site');
      return NextResponse.json(
        { error: 'Failed to create site' },
        { status: 500 }
      );
    }

    // Create the home page with the generated content
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        site_id: site.id,
        title: 'Home',
        slug: 'home',
        content,
        is_published: true,
        is_homepage: true,
      })
      .select()
      .single();

    if (pageError) {
      logger.error({ error: pageError }, 'Failed to create home page');
      // Rollback site creation
      await supabase.from('sites').delete().eq('id', site.id);
      return NextResponse.json(
        { error: 'Failed to create home page' },
        { status: 500 }
      );
    }

    // Store import record for reference
    const { error: importError } = await supabase
      .from('site_imports')
      .insert({
        site_id: site.id,
        source_url: importData.sourceUrl,
        source_platform: importData.sourcePlatform,
        scraped_data: importData.scrapedData,
        import_status: 'completed',
      });

    if (importError) {
      // Non-critical, just log
      logger.warn({ error: importError }, 'Failed to store import record');
    }

    logger.info(
      { siteId: site.id, pageId: page.id, userId: user.id },
      'Site created successfully from import'
    );

    return NextResponse.json({
      success: true,
      data: {
        site: {
          id: site.id,
          name: site.name,
          slug: site.slug,
        },
        page: {
          id: page.id,
          title: page.title,
          slug: page.slug,
        },
        urls: {
          builder: `/builder/${site.id}`,
          preview: `/sites/${site.slug}`,
          dashboard: `/dashboard/${site.id}`,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Create site endpoint error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
