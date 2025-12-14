'use client'

import { useEditMode } from './EditModeProvider'

export function EditToolbar() {
  const {
    isOwner,
    isEditMode,
    isPreviewing,
    pendingChanges,
    setIsPreviewing,
    saveContent,
    discardChanges,
  } = useEditMode()

  if (!isOwner) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white rounded-full shadow-lg border border-primary-200 px-4 py-2 flex items-center gap-3">
        {/* Edit/Preview Toggle */}
        <div className="flex items-center bg-primary-100 rounded-full p-1">
          <button
            onClick={() => setIsPreviewing(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !isPreviewing
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-600 hover:text-primary-900'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setIsPreviewing(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isPreviewing
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-600 hover:text-primary-900'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-primary-200" />

        {/* Save/Discard Actions */}
        {pendingChanges ? (
          <>
            <button
              onClick={discardChanges}
              className="px-4 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-900 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={saveContent}
              className="px-4 py-1.5 bg-accent-500 text-white text-sm font-medium rounded-full hover:bg-accent-600 transition-colors"
            >
              Save Changes
            </button>
          </>
        ) : (
          <span className="px-4 py-1.5 text-sm text-primary-400">
            All changes saved
          </span>
        )}
      </div>
    </div>
  )
}
