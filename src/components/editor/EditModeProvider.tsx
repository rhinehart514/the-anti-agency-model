'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { PageContent, Section } from '@/lib/content/types'
import { useToast } from '@/components/ui/Toast'

export interface SelectedElement {
  content: string
  sectionType?: string
  onApply: (newContent: string) => void
}

interface EditModeContextType {
  isEditMode: boolean
  isOwner: boolean
  isPreviewing: boolean
  content: PageContent | null
  pendingChanges: boolean
  selectedElement: SelectedElement | null
  setIsEditMode: (value: boolean) => void
  setIsPreviewing: (value: boolean) => void
  setSelectedElement: (element: SelectedElement | null) => void
  updateSection: <T extends Section['type']>(
    type: T,
    updates: Partial<Extract<Section, { type: T }>>
  ) => void
  updateSiteInfo: (updates: Partial<PageContent['siteInfo']>) => void
  saveContent: () => Promise<void>
  discardChanges: () => void
}

const EditModeContext = createContext<EditModeContextType | null>(null)

interface EditModeProviderProps {
  children: React.ReactNode
  isOwner: boolean
  initialContent: PageContent
  siteSlug: string
  pageSlug: string
}

export function EditModeProvider({
  children,
  isOwner,
  initialContent,
  siteSlug,
  pageSlug,
}: EditModeProviderProps) {
  const { showToast } = useToast()
  const [isEditMode, setIsEditMode] = useState(isOwner)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [content, setContent] = useState<PageContent>(initialContent)
  const [originalContent, setOriginalContent] = useState<PageContent>(initialContent)
  const [pendingChanges, setPendingChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)

  // Check for changes
  useEffect(() => {
    const hasChanges = JSON.stringify(content) !== JSON.stringify(originalContent)
    setPendingChanges(hasChanges)
  }, [content, originalContent])

  const updateSection = useCallback(<T extends Section['type']>(
    type: T,
    updates: Partial<Extract<Section, { type: T }>>
  ) => {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.type === type ? { ...section, ...updates } : section
      ),
    }))
  }, [])

  const updateSiteInfo = useCallback((updates: Partial<PageContent['siteInfo']>) => {
    setContent((prev) => ({
      ...prev,
      siteInfo: { ...prev.siteInfo, ...updates },
    }))
  }, [])

  const saveContent = useCallback(async () => {
    if (!pendingChanges || isSaving) return

    setIsSaving(true)

    try {
      const response = await fetch(`/api/sites/${siteSlug}/pages/${pageSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      setOriginalContent(content)
      setPendingChanges(false)
      showToast('Changes saved successfully', 'success')
    } catch (error) {
      console.error('Save failed:', error)
      showToast('Failed to save changes. Please try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [content, pendingChanges, isSaving, siteSlug, pageSlug, showToast])

  const discardChanges = useCallback(() => {
    setContent(originalContent)
    setPendingChanges(false)
    showToast('Changes discarded', 'info')
  }, [originalContent, showToast])

  return (
    <EditModeContext.Provider
      value={{
        isEditMode: isEditMode && !isPreviewing,
        isOwner,
        isPreviewing,
        content,
        pendingChanges,
        selectedElement,
        setIsEditMode,
        setIsPreviewing,
        setSelectedElement,
        updateSection,
        updateSiteInfo,
        saveContent,
        discardChanges,
      }}
    >
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode() {
  const context = useContext(EditModeContext)
  if (!context) {
    throw new Error('useEditMode must be used within an EditModeProvider')
  }
  return context
}
