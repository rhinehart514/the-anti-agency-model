import { createClient } from '@/lib/supabase/server'
import { DEFAULT_LAW_FIRM_CONTENT } from '@/lib/content/defaults'
import type { PageContent, Section } from '@/lib/content/types'
import { SitePageClient } from './SitePageClient'

async function getPageContent(siteSlug: string): Promise<{ content: PageContent; isOwner: boolean }> {
  // Skip database lookup if Supabase isn't configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { content: DEFAULT_LAW_FIRM_CONTENT, isOwner: true } // Demo mode
  }

  try {
    const supabase = createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Get the site
    const { data: site } = await supabase
      .from('sites')
      .select('id, owner_id')
      .eq('slug', siteSlug)
      .single()

    if (!site) {
      return { content: DEFAULT_LAW_FIRM_CONTENT, isOwner: true } // Demo mode for non-existent sites
    }

    const isOwner = user?.id === site.owner_id

    // Get the home page
    const { data: page } = await supabase
      .from('pages')
      .select('content')
      .eq('site_id', site.id)
      .eq('slug', 'home')
      .single()

    if (!page) {
      return { content: DEFAULT_LAW_FIRM_CONTENT, isOwner }
    }

    return { content: page.content as PageContent, isOwner }
  } catch {
    return { content: DEFAULT_LAW_FIRM_CONTENT, isOwner: true } // Demo mode on error
  }
}

export default async function SitePage({
  params,
}: {
  params: { siteSlug: string }
}) {
  const { content, isOwner } = await getPageContent(params.siteSlug)

  return (
    <SitePageClient
      content={content}
      isOwner={isOwner}
      siteSlug={params.siteSlug}
    />
  )
}
