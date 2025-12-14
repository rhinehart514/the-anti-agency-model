'use client'

import { useState } from 'react'
import { useWizard, type ServiceItem } from '../WizardProvider'
import { getIndustryDefaults } from '@/lib/content/templates'

const SERVICE_ICONS = [
  { id: 'shield', label: 'Shield', emoji: '🛡️' },
  { id: 'briefcase', label: 'Briefcase', emoji: '💼' },
  { id: 'users', label: 'Users', emoji: '👥' },
  { id: 'document', label: 'Document', emoji: '📄' },
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'scale', label: 'Scale', emoji: '⚖️' },
  { id: 'heart', label: 'Heart', emoji: '❤️' },
  { id: 'star', label: 'Star', emoji: '⭐' },
  { id: 'chart', label: 'Chart', emoji: '📈' },
  { id: 'gear', label: 'Gear', emoji: '⚙️' },
  { id: 'lightbulb', label: 'Lightbulb', emoji: '💡' },
  { id: 'globe', label: 'Globe', emoji: '🌐' },
]

export function ServicesStep() {
  const { state, setServices, addService, removeService, updateService, goNext, goBack, canGoNext } = useWizard()
  const [editingService, setEditingService] = useState<string | null>(null)
  const [newService, setNewService] = useState({ title: '', description: '', icon: 'star' })

  // Get suggested services based on industry
  const industryDefaults = state.industry ? getIndustryDefaults(state.industry) : null
  const suggestedServices = industryDefaults?.services || []

  const handleAddSuggested = (service: Omit<ServiceItem, 'id'>) => {
    addService(service)
  }

  const handleAddCustom = () => {
    if (newService.title.trim()) {
      addService(newService)
      setNewService({ title: '', description: '', icon: 'star' })
    }
  }

  const handleUpdateService = (id: string, updates: Partial<ServiceItem>) => {
    updateService(id, updates)
  }

  const unusedSuggestions = suggestedServices.filter(
    suggested => !state.services.some(s => s.title === suggested.title)
  )

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          What services do you offer?
        </h2>
        <p className="text-slate-600 mt-2">
          Add the services your business provides. You can always edit these later.
        </p>
      </div>

      {/* Current Services */}
      {state.services.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-slate-700">Your Services</h3>
          <div className="space-y-2">
            {state.services.map((service) => (
              <div
                key={service.id}
                className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg"
              >
                <span className="text-2xl">
                  {SERVICE_ICONS.find(i => i.id === service.icon)?.emoji || '⭐'}
                </span>
                <div className="flex-1 min-w-0">
                  {editingService === service.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={service.title}
                        onChange={(e) => handleUpdateService(service.id, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="Service name"
                      />
                      <textarea
                        value={service.description}
                        onChange={(e) => handleUpdateService(service.id, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                        rows={2}
                        placeholder="Description"
                      />
                      <div className="flex gap-2 flex-wrap">
                        {SERVICE_ICONS.map((icon) => (
                          <button
                            key={icon.id}
                            onClick={() => handleUpdateService(service.id, { icon: icon.id })}
                            className={`p-2 rounded ${service.icon === icon.id ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-slate-100'}`}
                          >
                            {icon.emoji}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setEditingService(null)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Done editing
                      </button>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-medium text-slate-900">{service.title}</h4>
                      <p className="text-sm text-slate-500 line-clamp-2">{service.description}</p>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingService(editingService === service.id ? null : service.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeService(service.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Services */}
      {unusedSuggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-slate-700">
            Suggested for {state.industry?.replace('-', ' ')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {unusedSuggestions.map((service, index) => (
              <button
                key={index}
                onClick={() => handleAddSuggested(service)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm transition-colors"
              >
                <span>{SERVICE_ICONS.find(i => i.id === service.icon)?.emoji || '⭐'}</span>
                <span>{service.title}</span>
                <span className="text-slate-400">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Service */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <h3 className="font-medium text-slate-700">Add a custom service</h3>
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={newService.title}
              onChange={(e) => setNewService({ ...newService, title: e.target.value })}
              placeholder="Service name"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            />
            <textarea
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              placeholder="Brief description (optional)"
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg resize-none"
            />
          </div>
          <button
            onClick={handleAddCustom}
            disabled={!newService.title.trim()}
            className={`
              px-4 py-2 rounded-lg font-medium self-start
              ${newService.title.trim() ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
            `}
          >
            Add
          </button>
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
