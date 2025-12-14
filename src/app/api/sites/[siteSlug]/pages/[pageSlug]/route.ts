import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PageContentSchema } from '@/lib/content/types'

export async function GET(
  request: Request,
  { params }: { params: { siteSlug: string; pageSlug: string } }
) {
  const supabase = createClient()

  // Get the site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', params.siteSlug)
    .single()

  if (siteError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  // Get the page
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('*')
    .eq('site_id', site.id)
    .eq('slug', params.pageSlug)
    .single()

  if (pageError || !page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  return NextResponse.json(page)
}

export async function PUT(
  request: Request,
  { params }: { params: { siteSlug: string; pageSlug: string } }
) {
  const supabase = createClient()

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

  // Parse and validate content
  const body = await request.json()
  const parseResult = PageContentSchema.safeParse(body.content)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid content', details: parseResult.error.issues },
      { status: 400 }
    )
  }

  // Get current page
  const { data: currentPage, error: pageError } = await supabase
    .from('pages')
    .select('id, content, version')
    .eq('site_id', site.id)
    .eq('slug', params.pageSlug)
    .single()

  if (pageError || !currentPage) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  // Save current version to history
  await supabase.from('content_versions').insert({
    page_id: currentPage.id,
    version: currentPage.version,
    content: currentPage.content,
    created_by: user.id,
  })

  // Update page with new content
  const { data: updatedPage, error: updateError } = await supabase
    .from('pages')
    .update({
      content: parseResult.data,
      version: currentPage.version + 1,
    })
    .eq('id', currentPage.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 })
  }

  return NextResponse.json(updatedPage)
}
