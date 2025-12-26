import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/templates - List public templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'popular';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('templates')
      .select(`
        *,
        template_installs: template_installs(count)
      `, { count: 'exact' })
      .eq('visibility', 'public')
      .eq('status', 'published')
      .range(offset, offset + limit - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Sorting
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'popular') {
      query = query.order('install_count', { ascending: false });
    } else if (sort === 'name') {
      query = query.order('name', { ascending: true });
    }

    const { data: templates, count, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Get categories for filtering
    const { data: categories } = await supabase
      .from('templates')
      .select('category')
      .eq('visibility', 'public')
      .eq('status', 'published');

    const uniqueCategories = [...new Set(categories?.map((c) => c.category).filter(Boolean))];

    return NextResponse.json({
      templates,
      categories: uniqueCategories,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Templates error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create a new template from a site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      siteId,
      name,
      description,
      category,
      visibility = 'private',
      thumbnail,
      preview_url,
      price,
    } = body;

    if (!siteId || !name) {
      return NextResponse.json(
        { error: 'Site ID and name are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the site to clone
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select(`
        *,
        pages (*),
        site_theme (*)
      `)
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Create template data structure
    const templateData = {
      pages: site.pages?.map((page: any) => ({
        name: page.name,
        slug: page.slug,
        sections: page.sections,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        is_homepage: page.is_homepage,
      })),
      theme: site.site_theme?.[0] || null,
      settings: site.settings,
    };

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({
        source_site_id: siteId,
        name,
        description,
        category,
        visibility,
        thumbnail,
        preview_url,
        price: price || 0,
        data: templateData,
        status: 'published',
        install_count: 0,
      })
      .select()
      .single();

    if (templateError) {
      console.error('Error creating template:', templateError);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
