'use client'

import { useState } from 'react'
import { useWizard } from '../WizardProvider'

const COMMON_STATS = [
  { label: 'Years Experience', placeholder: '10+' },
  { label: 'Clients Served', placeholder: '500+' },
  { label: 'Projects Completed', placeholder: '1,000+' },
  { label: 'Team Members', placeholder: '15' },
  { label: 'Customer Satisfaction', placeholder: '98%' },
  { label: 'Awards Won', placeholder: '12' },
]

export function AboutStep() {
  const { state, setAbout, addStat, removeStat, addTeamMember, removeTeamMember, goNext, goBack, canGoNext } = useWizard()
  const [newStat, setNewStat] = useState({ label: '', value: '' })
  const [newMember, setNewMember] = useState({ name: '', role: '' })

  const handleAddStat = () => {
    if (newStat.label.trim() && newStat.value.trim()) {
      addStat(newStat)
      setNewStat({ label: '', value: '' })
    }
  }

  const handleAddCommonStat = (label: string) => {
    setNewStat({ label, value: '' })
  }

  const handleAddTeamMember = () => {
    if (newMember.name.trim()) {
      addTeamMember(newMember)
      setNewMember({ name: '', role: '' })
    }
  }

  const unusedStats = COMMON_STATS.filter(
    cs => !state.about.stats.some(s => s.label === cs.label)
  )

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Tell your story
        </h2>
        <p className="text-slate-600 mt-2">
          Help visitors understand who you are and why they should choose you.
        </p>
      </div>

      {/* About Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          About Your Business <span className="text-red-500">*</span>
        </label>
        <textarea
          value={state.about.description}
          onChange={(e) => setAbout({ description: e.target.value })}
          placeholder="Tell potential customers about your business. What makes you different? What's your story? Why should they choose you?"
          rows={5}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
        />
        <p className="text-xs text-slate-500">
          Tip: Write in a friendly, conversational tone. You can always refine this later with AI assistance.
        </p>
      </div>

      {/* Stats */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Key Stats
            <span className="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
        </div>

        {/* Current Stats */}
        {state.about.stats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {state.about.stats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <span className="font-bold text-blue-700">{stat.value}</span>
                <span className="text-slate-600">{stat.label}</span>
                <button
                  onClick={() => removeStat(index)}
                  className="ml-1 text-slate-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Suggested Stats */}
        {unusedStats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {unusedStats.slice(0, 4).map((stat) => (
              <button
                key={stat.label}
                onClick={() => handleAddCommonStat(stat.label)}
                className="px-3 py-1 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
              >
                + {stat.label}
              </button>
            ))}
          </div>
        )}

        {/* Add Custom Stat */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newStat.label}
            onChange={(e) => setNewStat({ ...newStat, label: e.target.value })}
            placeholder="Stat label (e.g., Years Experience)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="text"
            value={newStat.value}
            onChange={(e) => setNewStat({ ...newStat, value: e.target.value })}
            placeholder="Value (e.g., 10+)"
            className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button
            onClick={handleAddStat}
            disabled={!newStat.label.trim() || !newStat.value.trim()}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              ${newStat.label.trim() && newStat.value.trim() ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
            `}
          >
            Add
          </button>
        </div>
      </div>

      {/* Team Members */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Team Members
            <span className="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
        </div>

        {/* Current Team */}
        {state.about.teamMembers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {state.about.teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-slate-600 font-medium">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{member.name}</p>
                  <p className="text-sm text-slate-500 truncate">{member.role}</p>
                </div>
                <button
                  onClick={() => removeTeamMember(member.id)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Team Member */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMember.name}
            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
            placeholder="Name"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="text"
            value={newMember.role}
            onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
            placeholder="Title/Role"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button
            onClick={handleAddTeamMember}
            disabled={!newMember.name.trim()}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              ${newMember.name.trim() ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
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
