import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { PageContent } from '@/lib/content/types'
import { SitePageClient } from '../SitePageClient'

async function getPageContent(
  siteSlug: string,
  pageSlug: string
): Promise<{ content: PageContent; isOwner: boolean } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return null
  }

  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Get the site
    const { data: site } = await supabase
      .from('sites')
      .select('id, owner_id')
      .eq('slug', siteSlug)
      .single()

    if (!site) {
      return null
    }

    const isOwner = user?.id === site.owner_id

    // Get the requested page
    const { data: page } = await supabase
      .from('pages')
      .select('content, is_published')
      .eq('site_id', site.id)
      .eq('slug', pageSlug)
      .single()

    if (!page) {
      return null
    }

    // Only show unpublished pages to owners
    if (!page.is_published && !isOwner) {
      return null
    }

    return { content: page.content as PageContent, isOwner }
  } catch {
    return null
  }
}

export default async function DynamicSitePage({
  params,
}: {
  params: { siteSlug: string; pageSlug: string }
}) {
  const result = await getPageContent(params.siteSlug, params.pageSlug)

  if (!result) {
    notFound()
  }

  return (
    <SitePageClient
      content={result.content}
      isOwner={result.isOwner}
      siteSlug={params.siteSlug}
      pageSlug={params.pageSlug}
    />
  )
}
