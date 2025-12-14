'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface Page {
  id: string
  slug: string
  title: string
  is_published: boolean
  updated_at: string
}

export function PagesTab() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const siteSlug = params.siteSlug as string
  const currentPageSlug = (params.pageSlug as string) || 'home'

  const [pages, setPages] = useState<Page[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewPage, setShowNewPage] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState('')
  const [newPageSlug, setNewPageSlug] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchPages = useCallback(async () => {
    try {
      const response = await fetch(`/api/sites/${siteSlug}/pages`)
      if (response.ok) {
        const data = await response.json()
        setPages(data)
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [siteSlug])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
  }

  const handleTitleChange = (title: string) => {
    setNewPageTitle(title)
    setNewPageSlug(generateSlug(title))
  }

  const handleCreatePage = async () => {
    if (!newPageTitle.trim() || !newPageSlug.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch(`/api/sites/${siteSlug}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPageTitle,
          slug: newPageSlug,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create page')
      }

      showToast('Page created successfully', 'success')
      setShowNewPage(false)
      setNewPageTitle('')
      setNewPageSlug('')
      fetchPages()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create page', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePage = async (pageSlug: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      const response = await fetch(`/api/sites/${siteSlug}/pages/${pageSlug}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete page')
      }

      showToast('Page deleted', 'success')
      fetchPages()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete page', 'error')
    }
  }

  const handleTogglePublish = async (pageSlug: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/sites/${siteSlug}/pages/${pageSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !currentStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update page')
      }

      showToast(currentStatus ? 'Page unpublished' : 'Page published', 'success')
      fetchPages()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update page', 'error')
    }
  }

  const handleNavigateToPage = (pageSlug: string) => {
    if (pageSlug === 'home') {
      router.push(`/sites/${siteSlug}`)
    } else {
      router.push(`/sites/${siteSlug}/${pageSlug}`)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-primary-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-primary-900">Site Pages</h3>
        <button
          onClick={() => setShowNewPage(true)}
          className="text-sm text-primary-600 hover:text-primary-900 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Page
        </button>
      </div>

      {/* New Page Form */}
      {showNewPage && (
        <div className="bg-primary-50 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              Page Title
            </label>
            <input
              type="text"
              value={newPageTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., About Us"
              className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              URL Slug
            </label>
            <div className="flex items-center text-sm">
              <span className="text-primary-400">/{siteSlug}/</span>
              <input
                type="text"
                value={newPageSlug}
                onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-2 py-2 border border-primary-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none ml-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreatePage}
              disabled={!newPageTitle.trim() || !newPageSlug.trim() || isCreating}
              className="flex-1 px-4 py-2 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Page'}
            </button>
            <button
              onClick={() => {
                setShowNewPage(false)
                setNewPageTitle('')
                setNewPageSlug('')
              }}
              className="px-4 py-2 border border-primary-200 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pages List */}
      <div className="space-y-2">
        {pages.map((page) => (
          <div
            key={page.id}
            className={`
              p-3 rounded-lg border transition-colors cursor-pointer
              ${page.slug === currentPageSlug
                ? 'border-primary-500 bg-primary-50'
                : 'border-primary-200 hover:border-primary-300'
              }
            `}
            onClick={() => handleNavigateToPage(page.slug)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-primary-900 text-sm">{page.title}</span>
                {page.slug === 'home' && (
                  <span className="text-xs bg-primary-200 text-primary-700 px-1.5 py-0.5 rounded">
                    Home
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTogglePublish(page.slug, page.is_published)
                  }}
                  className={`
                    text-xs px-2 py-0.5 rounded transition-colors
                    ${page.is_published
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }
                  `}
                  title={page.is_published ? 'Click to unpublish' : 'Click to publish'}
                >
                  {page.is_published ? 'Published' : 'Draft'}
                </button>
                {page.slug !== 'home' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePage(page.slug)
                    }}
                    className="p-1 text-primary-400 hover:text-red-500 transition-colors"
                    title="Delete page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-primary-500 mt-1">/{page.slug}</p>
          </div>
        ))}
      </div>

      {pages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-primary-500 text-sm">No pages yet</p>
        </div>
      )}
    </div>
  )
}
