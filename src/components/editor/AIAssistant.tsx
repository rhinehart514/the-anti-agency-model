'use client'

import { useState, useCallback } from 'react'

interface AIAssistantProps {
  content: string
  onApply: (newContent: string) => void
  onClose: () => void
  context?: {
    businessType?: string
    businessName?: string
    sectionType?: string
  }
}

const QUICK_ACTIONS = [
  { label: 'Make it more compelling', instruction: 'Make this more compelling and persuasive' },
  { label: 'Simplify', instruction: 'Simplify this text while keeping the core message' },
  { label: 'Make it professional', instruction: 'Make this sound more professional and trustworthy' },
  { label: 'Shorter', instruction: 'Make this more concise, about half the length' },
  { label: 'Add urgency', instruction: 'Add a sense of urgency without being pushy' },
]

export function AIAssistant({ content, onApply, onClose, context }: AIAssistantProps) {
  const [instruction, setInstruction] = useState('')
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSuggestion = useCallback(async (customInstruction?: string) => {
    const finalInstruction = customInstruction || instruction
    if (!finalInstruction.trim()) return

    setIsLoading(true)
    setError(null)
    setSuggestion(null)

    try {
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          instruction: finalInstruction,
          context,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate suggestion')
      }

      setSuggestion(data.suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [content, instruction, context])

  const handleApply = useCallback(() => {
    if (suggestion) {
      onApply(suggestion)
      onClose()
    }
  }, [suggestion, onApply, onClose])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-primary-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-primary-900">AI Assistant</h3>
              <p className="text-sm text-primary-500">Powered by Groq</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-primary-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current content */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Current content
            </label>
            <div className="p-4 bg-primary-50 rounded-lg text-primary-700 text-sm">
              {content}
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Quick actions
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => generateSuggestion(action.instruction)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom instruction */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Or describe what you want
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateSuggestion()}
                placeholder="e.g., Make it sound more friendly..."
                className="flex-1 px-4 py-2 border border-primary-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              />
              <button
                onClick={() => generateSuggestion()}
                disabled={isLoading || !instruction.trim()}
                className="px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  'Generate'
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Suggestion */}
          {suggestion && (
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Suggestion
              </label>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-primary-800">
                {suggestion}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {suggestion && (
          <div className="px-6 py-4 border-t border-primary-100 flex justify-end gap-3">
            <button
              onClick={() => setSuggestion(null)}
              className="px-4 py-2 text-primary-600 hover:text-primary-900"
            >
              Try again
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600"
            >
              Apply suggestion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
