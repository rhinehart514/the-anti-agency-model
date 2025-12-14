import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PageContentSchema } from '@/lib/content/types'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'You must be logged in to create a site' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { slug, name, template_id, settings, initialContent } = body

    // Validate required fields
    if (!slug || !name) {
      return NextResponse.json(
        { error: 'Site name and slug are required' },
        { status: 400 }
      )
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check if slug is already taken
    const { data: existingSite } = await supabase
      .from('sites')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingSite) {
      return NextResponse.json(
        { error: 'A site with this URL already exists. Please choose a different name.' },
        { status: 409 }
      )
    }

    // Validate content if provided
    if (initialContent) {
      const contentValidation = PageContentSchema.safeParse(initialContent)
      if (!contentValidation.success) {
        return NextResponse.json(
          { error: 'Invalid content format', details: contentValidation.error.issues },
          { status: 400 }
        )
      }
    }

    // Create the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        slug,
        name,
        template_id: template_id || 'custom',
        owner_id: user.id,
        settings: settings || {},
      })
      .select()
      .single()

    if (siteError) {
      console.error('Error creating site:', siteError)
      return NextResponse.json(
        { error: 'Failed to create site' },
        { status: 500 }
      )
    }

    // Create the home page with initial content
    const { error: pageError } = await supabase
      .from('pages')
      .insert({
        site_id: site.id,
        slug: 'home',
        title: name,
        content: initialContent,
        is_published: true,
        version: 1,
      })

    if (pageError) {
      console.error('Error creating page:', pageError)
      // Clean up the site if page creation fails
      await supabase.from('sites').delete().eq('id', site.id)
      return NextResponse.json(
        { error: 'Failed to create site page' },
        { status: 500 }
      )
    }

    return NextResponse.json(site, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/sites:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'You must be logged in to view your sites' },
      { status: 401 }
    )
  }

  // Get user's sites
  const { data: sites, error } = await supabase
    .from('sites')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }

  return NextResponse.json(sites)
}
