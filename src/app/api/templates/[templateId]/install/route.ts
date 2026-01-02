import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loggers } from '@/lib/logger';
import { nanoid } from 'nanoid';

// POST /api/templates/[templateId]/install - Install template to a site
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const body = await request.json();
    const { siteId, options = {} } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', params.templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if premium and handle payment
    if (template.price > 0) {
      // Check if user has purchased
      const { data: purchase } = await supabase
        .from('template_purchases')
        .select('id')
        .eq('template_id', params.templateId)
        .eq('site_id', siteId)
        .single();

      if (!purchase) {
        return NextResponse.json(
          { error: 'Template purchase required', price: template.price },
          { status: 402 }
        );
      }
    }

    // Verify site exists
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, organization_id')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    const templateData = template.data as {
      pages?: any[];
      theme?: any;
      settings?: any;
    };

    // Install options
    const {
      replacePages = true,
      replaceTheme = true,
      replaceSettings = false,
    } = options;

    // Track created resources for rollback if needed
    const createdResources: { type: string; id: string }[] = [];

    try {
      // Install pages
      if (templateData.pages && replacePages) {
        // Delete existing pages if replacing
        if (replacePages) {
          await supabase.from('pages').delete().eq('site_id', siteId);
        }

        // Create new pages from template
        for (const pageTemplate of templateData.pages) {
          const { data: page, error: pageError } = await supabase
            .from('pages')
            .insert({
              site_id: siteId,
              name: pageTemplate.name,
              slug: pageTemplate.slug || nanoid(8),
              sections: pageTemplate.sections || [],
              meta_title: pageTemplate.meta_title,
              meta_description: pageTemplate.meta_description,
              is_homepage: pageTemplate.is_homepage || false,
              status: 'published',
            })
            .select()
            .single();

          if (pageError) {
            loggers.api.error({ error: pageError }, 'Error creating page');
          } else if (page) {
            createdResources.push({ type: 'page', id: page.id });
          }
        }
      }

      // Install theme
      if (templateData.theme && replaceTheme) {
        // Delete existing theme
        await supabase.from('site_theme').delete().eq('site_id', siteId);

        // Create new theme
        const { data: theme, error: themeError } = await supabase
          .from('site_theme')
          .insert({
            site_id: siteId,
            colors: templateData.theme.colors || {},
            fonts: templateData.theme.fonts || {},
            spacing: templateData.theme.spacing || {},
            borders: templateData.theme.borders || {},
            custom_css: templateData.theme.custom_css || '',
          })
          .select()
          .single();

        if (themeError) {
          loggers.api.error({ error: themeError }, 'Error creating theme');
        } else if (theme) {
          createdResources.push({ type: 'theme', id: theme.id });
        }
      }

      // Install settings
      if (templateData.settings && replaceSettings) {
        await supabase
          .from('sites')
          .update({ settings: templateData.settings })
          .eq('id', siteId);
      }

      // Record install
      await supabase.from('template_installs').insert({
        template_id: params.templateId,
        site_id: siteId,
        options,
      });

      // Increment install count
      await supabase
        .from('templates')
        .update({ install_count: (template.install_count || 0) + 1 })
        .eq('id', params.templateId);

      return NextResponse.json({
        success: true,
        installed: {
          pages: createdResources.filter((r) => r.type === 'page').length,
          theme: createdResources.some((r) => r.type === 'theme'),
          settings: replaceSettings && templateData.settings,
        },
      });
    } catch (installError: any) {
      // Rollback created resources on error
      loggers.api.error({ error: installError }, 'Install error, rolling back');

      for (const resource of createdResources) {
        try {
          if (resource.type === 'page') {
            await supabase.from('pages').delete().eq('id', resource.id);
          } else if (resource.type === 'theme') {
            await supabase.from('site_theme').delete().eq('id', resource.id);
          }
        } catch (rollbackError) {
          loggers.api.error({ error: rollbackError }, 'Rollback error');
        }
      }

      return NextResponse.json(
        { error: 'Failed to install template' },
        { status: 500 }
      );
    }
  } catch (error) {
    loggers.api.error({ error }, 'Install template error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
