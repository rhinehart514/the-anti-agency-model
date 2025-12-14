'use client'

import { useState } from 'react'
import { useEditMode } from '../EditModeProvider'

interface QuickAction {
  id: string
  label: string
  prompt: string
}

const quickActions: QuickAction[] = [
  { id: 'compelling', label: 'Make Compelling', prompt: 'Make this more compelling and engaging' },
  { id: 'simplify', label: 'Simplify', prompt: 'Simplify this text for easier reading' },
  { id: 'shorten', label: 'Shorten', prompt: 'Make this more concise' },
  { id: 'professional', label: 'Professional', prompt: 'Make this sound more professional' },
]

export function EditTab() {
  const { selectedElement, content } = useEditMode()
  const [customPrompt, setCustomPrompt] = useState('')
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleQuickAction = async (action: QuickAction) => {
    if (!selectedElement) return
    await generateSuggestion(action.prompt)
  }

  const handleCustomPrompt = async () => {
    if (!selectedElement || !customPrompt.trim()) return
    await generateSuggestion(customPrompt)
    setCustomPrompt('')
  }

  const generateSuggestion = async (prompt: string) => {
    if (!selectedElement) return

    setIsLoading(true)
    setError(null)
    setSuggestion(null)

    try {
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: selectedElement.content,
          instruction: prompt,
          context: {
            sectionType: selectedElement.sectionType,
            businessName: content?.siteInfo?.firmName,
            businessType: 'law-firm',
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate suggestion')
      }

      const data = await response.json()
      setSuggestion(data.rewritten)
    } catch {
      setError('Failed to generate suggestion. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = () => {
    if (!suggestion || !selectedElement?.onApply) return
    selectedElement.onApply(suggestion)
    setSuggestion(null)
  }

  const handleTryAgain = () => {
    setSuggestion(null)
  }

  if (!selectedElement) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-primary-900 mb-2">
            Click any text to edit
          </h3>
          <p className="text-sm text-primary-500">
            Select a headline, paragraph, or any editable text on your site to see AI suggestions here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Selected Element */}
      <div className="bg-primary-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-primary-500 uppercase tracking-wide">
            Selected
          </span>
          {selectedElement.sectionType && (
            <span className="text-xs bg-primary-200 text-primary-700 px-2 py-0.5 rounded">
              {selectedElement.sectionType}
            </span>
          )}
        </div>
        <p className="text-primary-900 text-sm line-clamp-3">
          &ldquo;{selectedElement.content}&rdquo;
        </p>
      </div>

      {/* Quick Actions */}
      {!suggestion && !isLoading && (
        <>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Or describe what you want:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomPrompt()}
                placeholder="Make it sound friendlier..."
                className="flex-1 px-3 py-2 text-sm border border-primary-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              />
              <button
                onClick={handleCustomPrompt}
                disabled={!customPrompt.trim()}
                className="px-4 py-2 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Go
              </button>
            </div>
          </div>
        </>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-primary-900">Generating suggestion...</p>
              <p className="text-xs text-primary-500">This may take a moment</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Suggestion */}
      {suggestion && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-purple-600 mb-1">AI Suggestion</p>
              <p className="text-sm text-primary-900">{suggestion}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleTryAgain}
              className="px-4 py-2 border border-primary-200 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
