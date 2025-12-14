import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]

  // Dynamic site pages would be fetched from database in production
  // For now, return static pages only
  // In production, you would fetch all published sites:
  //
  // const supabase = createClient()
  // const { data: sites } = await supabase
  //   .from('sites')
  //   .select('slug, updated_at')
  //
  // const sitePages = sites?.map(site => ({
  //   url: `${baseUrl}/sites/${site.slug}`,
  //   lastModified: new Date(site.updated_at),
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.8,
  // })) || []

  return [...staticPages]
}
