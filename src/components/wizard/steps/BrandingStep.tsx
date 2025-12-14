'use client'

import { useWizard } from '../WizardProvider'

const COLOR_SCHEMES = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Navy & Gold - Classic and trustworthy',
    primary: '#1e3a5f',
    accent: '#c9a227',
    bg: '#f8fafc',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Slate & Blue - Clean and contemporary',
    primary: '#334155',
    accent: '#3b82f6',
    bg: '#ffffff',
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Burgundy & Cream - Welcoming and refined',
    primary: '#7f1d1d',
    accent: '#f59e0b',
    bg: '#fef7ed',
  },
  {
    id: 'fresh',
    name: 'Fresh',
    description: 'Green & White - Natural and approachable',
    primary: '#166534',
    accent: '#22c55e',
    bg: '#f0fdf4',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Black & Orange - Confident and energetic',
    primary: '#171717',
    accent: '#f97316',
    bg: '#fafaf9',
  },
  {
    id: 'calm',
    name: 'Calm',
    description: 'Teal & Sand - Serene and balanced',
    primary: '#0f766e',
    accent: '#14b8a6',
    bg: '#f5f5f4',
  },
]

const TONES = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Formal and authoritative',
    example: 'We deliver exceptional results through expertise and dedication.',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm and approachable',
    example: "We're here to help you succeed - let's work together!",
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Confident and direct',
    example: 'Transform your business. Get results. Start today.',
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Classic and established',
    example: 'Serving our community with distinction for over 30 years.',
  },
]

export function BrandingStep() {
  const { state, setBranding, goNext, goBack } = useWizard()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Choose your brand style
        </h2>
        <p className="text-slate-600 mt-2">
          Select colors and tone that match your brand personality.
        </p>
      </div>

      {/* Color Scheme */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Color Scheme
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => setBranding({ colorScheme: scheme.id })}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                ${
                  state.branding.colorScheme === scheme.id
                    ? 'border-blue-600 ring-2 ring-blue-200'
                    : 'border-slate-200 hover:border-slate-300'
                }
              `}
              style={{ backgroundColor: scheme.bg }}
            >
              {/* Color Preview */}
              <div className="flex gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: scheme.primary }}
                />
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: scheme.accent }}
                />
              </div>
              <h4 className="font-medium text-slate-900">{scheme.name}</h4>
              <p className="text-xs text-slate-500 mt-1">{scheme.description}</p>

              {state.branding.colorScheme === scheme.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <label className="block text-sm font-medium text-slate-700">
          Writing Tone
        </label>
        <p className="text-sm text-slate-500">
          This affects how content suggestions are written for your site.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TONES.map((tone) => (
            <button
              key={tone.id}
              onClick={() => setBranding({ tone: tone.id as WizardState['branding']['tone'] })}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                ${
                  state.branding.tone === tone.id
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
            >
              <h4 className="font-medium text-slate-900">{tone.name}</h4>
              <p className="text-xs text-slate-500">{tone.description}</p>
              <p className="text-sm text-slate-600 mt-2 italic">"{tone.example}"</p>

              {state.branding.tone === tone.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={goBack}
          className="px-6 py-3 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-all duration-200"
        >
          Back
        </button>
        <button
          onClick={goNext}
          className="px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

type WizardState = {
  branding: {
    colorScheme: string
    tone: 'professional' | 'friendly' | 'bold' | 'traditional'
  }
}
