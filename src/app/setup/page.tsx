'use client'

import { WizardProvider, useWizard } from '@/components/wizard/WizardProvider'
import { WizardProgress } from '@/components/wizard/WizardProgress'
import { IndustryStep } from '@/components/wizard/steps/IndustryStep'
import { BusinessInfoStep } from '@/components/wizard/steps/BusinessInfoStep'
import { ServicesStep } from '@/components/wizard/steps/ServicesStep'
import { AboutStep } from '@/components/wizard/steps/AboutStep'
import { BrandingStep } from '@/components/wizard/steps/BrandingStep'
import { ReviewStep } from '@/components/wizard/steps/ReviewStep'

function WizardSteps() {
  const { currentStep } = useWizard()

  const steps = [
    <IndustryStep key="industry" />,
    <BusinessInfoStep key="business" />,
    <ServicesStep key="services" />,
    <AboutStep key="about" />,
    <BrandingStep key="branding" />,
    <ReviewStep key="review" />,
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <WizardProgress />
      <div className="mt-8">
        {steps[currentStep]}
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <WizardProvider>
      <WizardSteps />
    </WizardProvider>
  )
}
