'use client'

import { useCallback, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useEditMode } from './EditModeProvider'
import { useToast } from '@/components/ui/Toast'

interface EditableImageProps {
  src: string
  alt: string
  onChange: (src: string, alt: string) => void
  className?: string
  aspectRatio?: string
}

export function EditableImage({
  src,
  alt,
  onChange,
  className = '',
  aspectRatio = '16/9',
}: EditableImageProps) {
  const { isEditMode } = useEditMode()
  const { showToast } = useToast()
  const params = useParams()
  const siteSlug = params.siteSlug as string
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showAltModal, setShowAltModal] = useState(false)
  const [tempAlt, setTempAlt] = useState(alt)

  const handleClick = useCallback(() => {
    if (isEditMode) {
      fileInputRef.current?.click()
    }
  }, [isEditMode])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        showToast('Image must be less than 5MB', 'error')
        return
      }

      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)
        if (siteSlug) {
          formData.append('siteSlug', siteSlug)
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload')
        }

        onChange(data.url, alt)
        showToast('Image uploaded successfully', 'success')
      } catch (error) {
        console.error('Upload failed:', error)
        showToast('Failed to upload image', 'error')
      } finally {
        setIsUploading(false)
      }
    },
    [onChange, alt, siteSlug, showToast]
  )

  const handleAltSave = useCallback(() => {
    onChange(src, tempAlt)
    setShowAltModal(false)
  }, [src, tempAlt, onChange])

  // View mode
  if (!isEditMode) {
    return (
      <div className={`relative ${className}`} style={{ aspectRatio }}>
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary-200 flex items-center justify-center">
            <span className="text-primary-400">No image</span>
          </div>
        )}
      </div>
    )
  }

  // Edit mode
  return (
    <>
      <div
        onClick={handleClick}
        className={`relative cursor-pointer group ${className}`}
        style={{ aspectRatio }}
      >
        {/* Image */}
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary-200 flex items-center justify-center">
            <span className="text-primary-400">Click to add image</span>
          </div>
        )}

        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isUploading ? (
            <div className="text-white">Uploading...</div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-white">
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm font-medium">Change Image</span>
            </div>
          )}
        </div>

        {/* Alt text button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setTempAlt(alt)
            setShowAltModal(true)
          }}
          className="absolute bottom-2 right-2 bg-white/90 hover:bg-white px-3 py-1 rounded text-xs font-medium text-primary-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Edit Alt Text
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Alt text modal */}
      {showAltModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">
              Edit Alt Text
            </h3>
            <p className="text-sm text-primary-600 mb-4">
              Alt text helps screen readers describe images to visually impaired
              users and improves SEO.
            </p>
            <textarea
              value={tempAlt}
              onChange={(e) => setTempAlt(e.target.value)}
              placeholder="Describe what's in this image..."
              className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowAltModal(false)}
                className="px-4 py-2 text-primary-600 hover:text-primary-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAltSave}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
