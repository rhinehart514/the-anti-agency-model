'use client'

import { useWizard } from '../WizardProvider'

export function BusinessInfoStep() {
  const { state, setBusinessInfo, goNext, goBack, canGoNext } = useWizard()

  const handleChange = (field: keyof typeof state.businessInfo, value: string) => {
    setBusinessInfo({ [field]: value })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Tell us about your business
        </h2>
        <p className="text-slate-600 mt-2">
          This information will appear throughout your website.
        </p>
      </div>

      <div className="max-w-xl mx-auto space-y-4 mt-8">
        {/* Business Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={state.businessInfo.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Smith & Johnson Law"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Tagline */}
        <div>
          <label htmlFor="tagline" className="block text-sm font-medium text-slate-700 mb-1">
            Tagline
            <span className="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
          <input
            type="text"
            id="tagline"
            value={state.businessInfo.tagline}
            onChange={(e) => handleChange('tagline', e.target.value)}
            placeholder="e.g., Trusted Legal Counsel When You Need It Most"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
          <p className="text-xs text-slate-500 mt-1">
            A short phrase that describes what makes your business special
          </p>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={state.businessInfo.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="e.g., info@yourbusiness.com"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
            Phone
            <span className="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            value={state.businessInfo.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="e.g., (555) 123-4567"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
            Address
            <span className="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            id="address"
            value={state.businessInfo.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="e.g., 123 Main Street, Suite 100&#10;San Francisco, CA 94102"
            rows={2}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
          />
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
          disabled={!canGoNext}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${
              canGoNext
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
