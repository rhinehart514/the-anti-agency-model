'use client'

import { useState } from 'react'

interface Alert {
  id: string
  type: 'warning' | 'info' | 'success'
  category: 'content' | 'seo' | 'performance' | 'broken'
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
  }
  timestamp: Date
}

// Mock alerts for demonstration
const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'warning',
    category: 'content',
    title: 'Testimonials are 2+ years old',
    description: 'Your testimonials were last updated in 2022. Fresh testimonials improve trust.',
    action: { label: 'Request new testimonials' },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '2',
    type: 'warning',
    category: 'content',
    title: 'Holiday hours not updated',
    description: 'Your office hours still show 2024 holiday schedule.',
    action: { label: 'Update hours' },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '3',
    type: 'warning',
    category: 'broken',
    title: 'Contact form email bouncing',
    description: 'Emails to info@example.com have been bouncing for 3 days.',
    action: { label: 'Fix email' },
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
]

const categoryIcons: Record<Alert['category'], React.ReactNode> = {
  content: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  seo: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  performance: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  broken: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
}

export function AgentTab() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id))
  const warningCount = visibleAlerts.filter((a) => a.type === 'warning').length

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]))
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  return (
    <div className="p-4 space-y-4">
      {/* Status Summary */}
      <div className={`rounded-lg p-4 ${warningCount > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${warningCount > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
            {warningCount > 0 ? (
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className={`font-semibold ${warningCount > 0 ? 'text-amber-800' : 'text-green-800'}`}>
              {warningCount > 0 ? `${warningCount} items need attention` : 'All clear!'}
            </h3>
            <p className={`text-sm ${warningCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {warningCount > 0 ? 'Review the alerts below' : 'Your site is in good shape'}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {visibleAlerts.length > 0 ? (
        <div className="space-y-3">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white border border-primary-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  alert.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                  alert.type === 'info' ? 'bg-blue-100 text-blue-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {categoryIcons[alert.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-primary-900 text-sm">
                      {alert.title}
                    </h4>
                    <span className="text-xs text-primary-400">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-primary-600 mb-3">
                    {alert.description}
                  </p>
                  <div className="flex items-center gap-2">
                    {alert.action && (
                      <button
                        onClick={alert.action.onClick}
                        className="px-3 py-1 text-xs font-medium bg-primary-900 text-white rounded hover:bg-primary-800 transition-colors"
                      >
                        {alert.action.label}
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="px-3 py-1 text-xs font-medium text-primary-500 hover:text-primary-700 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-primary-600">No alerts at this time</p>
        </div>
      )}

      {/* Agent Capabilities */}
      <div className="border-t border-primary-200 pt-4 mt-6">
        <h4 className="text-xs font-medium text-primary-500 uppercase tracking-wide mb-3">
          What your agent monitors
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { icon: '📝', label: 'Content freshness' },
            { icon: '🔍', label: 'SEO rankings' },
            { icon: '🔗', label: 'Broken links' },
            { icon: '⚡', label: 'Page speed' },
            { icon: '📧', label: 'Form delivery' },
            { icon: '👀', label: 'Competitor changes' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-primary-600 py-1">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
