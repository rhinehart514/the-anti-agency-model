'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWizard } from '../WizardProvider'
import { generatePageContent, generateSlug } from '@/lib/content/templates'

export function ReviewStep() {
  const router = useRouter()
  const { state, goBack, goToStep } = useWizard()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slug = generateSlug(state.businessInfo.name)
  const previewContent = generatePageContent(state)

  const handleCreate = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: state.businessInfo.name,
          template_id: state.industry,
          settings: {
            industry: state.industry,
            branding: state.branding,
          },
          initialContent: previewContent,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create site')
      }

      const site = await response.json()
      router.push(`/sites/${site.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Review your site
        </h2>
        <p className="text-slate-600 mt-2">
          Here's a summary of your new website. You can edit everything after launch.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4">
        {/* Business Info */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Business Info</h3>
            <button
              onClick={() => goToStep(1)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex">
              <dt className="w-24 text-slate-500">Name</dt>
              <dd className="text-slate-900 font-medium">{state.businessInfo.name || '—'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-slate-500">URL</dt>
              <dd className="text-slate-900">
                <code className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                  /sites/{slug || 'your-site'}
                </code>
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-slate-500">Email</dt>
              <dd className="text-slate-900">{state.businessInfo.email || '—'}</dd>
            </div>
            {state.businessInfo.tagline && (
              <div className="flex">
                <dt className="w-24 text-slate-500">Tagline</dt>
                <dd className="text-slate-900">{state.businessInfo.tagline}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Services */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Services</h3>
            <button
              onClick={() => goToStep(2)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          </div>
          {state.services.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {state.services.map((service) => (
                <span
                  key={service.id}
                  className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700"
                >
                  {service.title}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No services added</p>
          )}
        </div>

        {/* About */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">About</h3>
            <button
              onClick={() => goToStep(3)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          </div>
          <p className="text-sm text-slate-600 line-clamp-3">
            {state.about.description || 'No description added'}
          </p>
          {state.about.stats.length > 0 && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
              {state.about.stats.slice(0, 3).map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="font-bold text-slate-900">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Branding */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Branding</h3>
            <button
              onClick={() => goToStep(4)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">Color:</span>
            <span className="text-slate-900 capitalize">{state.branding.colorScheme}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Tone:</span>
            <span className="text-slate-900 capitalize">{state.branding.tone}</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-6">
        <button
          onClick={goBack}
          disabled={isCreating}
          className="px-6 py-3 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-all duration-200 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className={`
            px-8 py-3 rounded-lg font-medium transition-all duration-200
            bg-green-600 text-white hover:bg-green-700
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2
          `}
        >
          {isCreating ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating...
            </>
          ) : (
            <>
              Launch Your Site
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
