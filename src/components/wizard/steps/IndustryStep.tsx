'use client'

import { useWizard } from '../WizardProvider'

const INDUSTRIES = [
  {
    id: 'law-firm',
    name: 'Law Firm',
    description: 'Legal services and attorney practice',
    icon: '⚖️',
  },
  {
    id: 'medical',
    name: 'Medical Practice',
    description: 'Healthcare and medical services',
    icon: '🏥',
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Property sales, rentals, and management',
    icon: '🏠',
  },
  {
    id: 'consulting',
    name: 'Consulting',
    description: 'Business and professional consulting',
    icon: '💼',
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Food service and hospitality',
    icon: '🍽️',
  },
  {
    id: 'retail',
    name: 'Retail',
    description: 'Products and retail services',
    icon: '🛍️',
  },
  {
    id: 'fitness',
    name: 'Fitness & Wellness',
    description: 'Gyms, trainers, and wellness services',
    icon: '💪',
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Custom business type',
    icon: '✨',
  },
]

export function IndustryStep() {
  const { state, setIndustry, goNext } = useWizard()

  const handleSelect = (industryId: string) => {
    setIndustry(industryId)
  }

  const handleContinue = () => {
    if (state.industry) {
      goNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          What type of business do you have?
        </h2>
        <p className="text-slate-600 mt-2">
          We'll customize your site with industry-specific content and features.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {INDUSTRIES.map((industry) => (
          <button
            key={industry.id}
            onClick={() => handleSelect(industry.id)}
            className={`
              relative p-4 rounded-xl border-2 text-left transition-all duration-200
              hover:border-blue-300 hover:bg-blue-50
              ${
                state.industry === industry.id
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 bg-white'
              }
            `}
          >
            <div className="text-3xl mb-2">{industry.icon}</div>
            <h3 className="font-semibold text-slate-900">{industry.name}</h3>
            <p className="text-sm text-slate-500 mt-1">{industry.description}</p>
            {state.industry === industry.id && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-6">
        <button
          onClick={handleContinue}
          disabled={!state.industry}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${
              state.industry
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
