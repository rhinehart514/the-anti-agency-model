import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreatePageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
})

export async function GET(
  request: Request,
  { params }: { params: { siteSlug: string } }
) {
  const supabase = await createClient()

  // First get the site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', params.siteSlug)
    .single()

  if (siteError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  // Then get all pages for the site
  const { data: pages, error: pagesError } = await supabase
    .from('pages')
    .select('id, slug, title, is_published, updated_at')
    .eq('site_id', site.id)
    .order('slug')

  if (pagesError) {
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
  }

  return NextResponse.json(pages)
}

export async function POST(
  request: Request,
  { params }: { params: { siteSlug: string } }
) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the site and verify ownership
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, owner_id')
    .eq('slug', params.siteSlug)
    .single()

  if (siteError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  if (site.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse and validate input
  const body = await request.json()
  const validation = CreatePageSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error.issues },
      { status: 400 }
    )
  }

  const { title, slug } = validation.data

  // Check if slug already exists for this site
  const { data: existingPage } = await supabase
    .from('pages')
    .select('id')
    .eq('site_id', site.id)
    .eq('slug', slug)
    .single()

  if (existingPage) {
    return NextResponse.json(
      { error: 'A page with this slug already exists' },
      { status: 409 }
    )
  }

  // Create the page with default content
  const defaultContent = {
    siteInfo: {
      firmName: title,
      phone: '',
      email: '',
      address: '',
    },
    sections: [
      {
        type: 'hero',
        headline: title,
        subheadline: 'Add your content here',
        ctaText: 'Contact Us',
        ctaUrl: '#contact',
      },
    ],
  }

  const { data: page, error: createError } = await supabase
    .from('pages')
    .insert({
      site_id: site.id,
      slug,
      title,
      content: defaultContent,
      is_published: false,
      version: 1,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating page:', createError)
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
  }

  return NextResponse.json(page, { status: 201 })
}
