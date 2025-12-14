import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface Site {
  id: string
  slug: string
  name: string
  template_id: string
  created_at: string
  updated_at: string
}

async function getUserSites(): Promise<Site[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return []
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  return (sites as Site[]) || []
}

export default async function DashboardPage() {
  const sites = await getUserSites()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-slate-900">
              The Anti-Agency
            </Link>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Site
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Your Websites</h1>
          <p className="text-slate-600 mt-1">Manage and edit your websites</p>
        </div>

        {sites.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
      <svg
        className="w-16 h-16 text-slate-300 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">No websites yet</h3>
      <p className="text-slate-600 mb-6 max-w-sm mx-auto">
        Create your first website in minutes. No coding required.
      </p>
      <Link
        href="/setup"
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Your First Site
      </Link>
    </div>
  )
}

function SiteCard({ site }: { site: Site }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getIndustryLabel = (templateId: string) => {
    const labels: Record<string, string> = {
      'law-firm': 'Law Firm',
      medical: 'Medical Practice',
      'real-estate': 'Real Estate',
      consulting: 'Consulting',
      restaurant: 'Restaurant',
      retail: 'Retail',
      fitness: 'Fitness',
      other: 'Business',
    }
    return labels[templateId] || 'Business'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Preview Placeholder */}
      <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto mb-2">
            <span className="text-2xl font-bold text-slate-400">
              {site.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-slate-500">{getIndustryLabel(site.template_id)}</p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 truncate">{site.name}</h3>
        <p className="text-sm text-slate-500 mt-1">
          Updated {formatDate(site.updated_at)}
        </p>

        <div className="flex gap-2 mt-4">
          <Link
            href={`/sites/${site.slug}`}
            className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Site
          </Link>
          <a
            href={`/sites/${site.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            title="View live site"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
