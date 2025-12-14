import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { siteSlug: string } }
) {
  const supabase = createClient()

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
