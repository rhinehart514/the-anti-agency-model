'use client'

import { useWizard } from './WizardProvider'

const STEP_LABELS = [
  'Industry',
  'Business Info',
  'Services',
  'About',
  'Branding',
  'Review',
]

export function WizardProgress() {
  const { currentStep, totalSteps, isStepComplete, goToStep } = useWizard()

  return (
    <div className="mb-8">
      {/* Mobile: Simple progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-slate-500">
            {STEP_LABELS[currentStep]}
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: Step indicators */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between">
          {STEP_LABELS.map((label, index) => {
            const isComplete = isStepComplete(index)
            const isCurrent = index === currentStep
            const isPast = index < currentStep
            const isClickable = isPast || (index === currentStep + 1 && isStepComplete(currentStep))

            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                {/* Step circle */}
                <button
                  onClick={() => isClickable && goToStep(index)}
                  disabled={!isClickable}
                  className={`
                    relative flex items-center justify-center w-10 h-10 rounded-full
                    text-sm font-medium transition-all duration-200
                    ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : isPast || isComplete
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-200 text-slate-500'
                    }
                    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  `}
                >
                  {isPast ? (
                    <svg className="w-5 h-5\" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </button>

                {/* Label */}
                <span
                  className={`
                    absolute mt-14 text-xs font-medium whitespace-nowrap
                    ${isCurrent ? 'text-blue-600' : isPast ? 'text-slate-700' : 'text-slate-400'}
                  `}
                  style={{ transform: 'translateX(-50%)', left: '50%' }}
                >
                  {label}
                </span>

                {/* Connector line */}
                {index < STEP_LABELS.length - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-2 rounded
                      ${index < currentStep ? 'bg-blue-600' : 'bg-slate-200'}
                    `}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
