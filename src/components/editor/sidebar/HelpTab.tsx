'use client'

import { useState } from 'react'

interface HelpRequest {
  id: string
  type: 'review' | 'design' | 'content' | 'technical'
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: Date
}

const requestTypes = [
  {
    id: 'review',
    label: 'Content Review',
    description: 'Have a human expert review and improve your content',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'design',
    label: 'Design Help',
    description: 'Get design recommendations or custom styling',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    id: 'content',
    label: 'Content Writing',
    description: 'Have us write new content for your site',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'technical',
    label: 'Technical Support',
    description: 'Fix issues or add custom functionality',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export function HelpTab() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [requests] = useState<HelpRequest[]>([])

  const handleSubmit = async () => {
    if (!selectedType || !description.trim()) return

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setSubmitted(true)
    setDescription('')
    setSelectedType(null)

    // Reset after 3 seconds
    setTimeout(() => setSubmitted(false), 3000)
  }

  if (submitted) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-primary-900 mb-2">
            Request Submitted!
          </h3>
          <p className="text-sm text-primary-600">
            Our team will review your request and get back to you within 24 hours.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Intro */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-4">
        <h3 className="font-semibold text-primary-900 mb-1">Need human help?</h3>
        <p className="text-sm text-primary-600">
          Our team is here to help with anything AI can&apos;t handle.
        </p>
      </div>

      {/* Request Types */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary-700">
          What do you need help with?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {requestTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`
                p-3 rounded-lg border-2 text-left transition-all
                ${selectedType === type.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-primary-200 hover:border-primary-300 bg-white'
                }
              `}
            >
              <div className={`mb-2 ${selectedType === type.id ? 'text-primary-700' : 'text-primary-400'}`}>
                {type.icon}
              </div>
              <div className="text-sm font-medium text-primary-900">{type.label}</div>
              <div className="text-xs text-primary-500 mt-0.5 line-clamp-2">
                {type.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      {selectedType && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-primary-700">
            Describe what you need
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us more about what you need..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
            className="w-full px-4 py-2 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      )}

      {/* Previous Requests */}
      {requests.length > 0 && (
        <div className="border-t border-primary-200 pt-4">
          <h4 className="text-sm font-medium text-primary-700 mb-3">Your requests</h4>
          <div className="space-y-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-primary-50 rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-primary-900">
                    {requestTypes.find((t) => t.id === request.type)?.label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    request.status === 'completed' ? 'bg-green-100 text-green-700' :
                    request.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {request.status === 'in_progress' ? 'In Progress' :
                     request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                <p className="text-primary-600 line-clamp-2">{request.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Options */}
      <div className="border-t border-primary-200 pt-4">
        <h4 className="text-xs font-medium text-primary-500 uppercase tracking-wide mb-3">
          Other ways to reach us
        </h4>
        <div className="space-y-2">
          <a
            href="mailto:support@antiagency.com"
            className="flex items-center gap-3 text-sm text-primary-600 hover:text-primary-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@antiagency.com
          </a>
          <a
            href="#"
            className="flex items-center gap-3 text-sm text-primary-600 hover:text-primary-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Live chat (coming soon)
          </a>
        </div>
      </div>
    </div>
  )
}
