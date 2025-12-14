'use client'

import { useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEditMode } from './EditModeProvider'

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span'
  richText?: boolean
  aiContext?: {
    businessType?: string
    businessName?: string
    sectionType?: string
  }
}

export function EditableText({
  value,
  onChange,
  placeholder = 'Click to edit...',
  className = '',
  as: Component = 'p',
  richText = false,
  aiContext,
}: EditableTextProps) {
  const { isEditMode, content, setSelectedElement, selectedElement } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: richText ? {} : false,
        bulletList: richText ? {} : false,
        orderedList: richText ? {} : false,
        blockquote: richText ? {} : false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent-600 underline hover:text-accent-700',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: isEditMode && isEditing,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      if (!richText) {
        const text = editor.getText()
        onChange(text)
      } else {
        const html = editor.getHTML()
        onChange(html)
      }
    },
    onBlur: () => {
      setIsEditing(false)
    },
  })

  const handleClick = useCallback(() => {
    if (isEditMode && !isEditing) {
      setIsEditing(true)
      setTimeout(() => editor?.commands.focus('end'), 0)
    }
  }, [isEditMode, isEditing, editor])

  const handleAISelect = useCallback(() => {
    setSelectedElement({
      content: value,
      sectionType: aiContext?.sectionType,
      onApply: (newContent: string) => {
        onChange(newContent)
        if (editor) {
          editor.commands.setContent(newContent)
        }
      },
    })
  }, [value, aiContext?.sectionType, onChange, editor, setSelectedElement])

  // Check if this element is currently selected in the sidebar
  const isSelected = selectedElement?.content === value && selectedElement?.sectionType === aiContext?.sectionType

  // View mode - just render the content
  if (!isEditMode) {
    if (richText) {
      return (
        <div
          className={className}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      )
    }
    return <Component className={className}>{value}</Component>
  }

  // Edit mode - render editable
  return (
    <>
      <div
        onClick={handleClick}
        className={`
          ${className}
          ${isEditing ? '' : 'cursor-pointer'}
          relative group
        `}
      >
        {/* AI button - selects element in sidebar */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAISelect()
            }}
            className={`absolute -right-10 top-1/2 -translate-y-1/2 transition-all w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:scale-110 transform duration-200 shadow-lg ${
              isSelected ? 'opacity-100 ring-2 ring-purple-300 ring-offset-2' : 'opacity-0 group-hover:opacity-100'
            }`}
            title="AI Assistant"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        )}

        {/* Edit indicator */}
        {!isEditing && (
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Hover outline */}
        <div
          className={`
            absolute inset-0 -m-2 rounded-lg transition-all pointer-events-none
            ${isEditing ? 'ring-2 ring-accent-500 bg-white/50' : 'group-hover:ring-2 group-hover:ring-accent-300'}
          `}
        />

        {/* Editor content */}
        <EditorContent
          editor={editor}
          className={`
            outline-none
            ${isEditing ? 'relative z-10' : ''}
            [&_.ProseMirror]:outline-none
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-primary-400
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none
          `}
        />

        {/* Formatting toolbar for rich text */}
        {isEditing && richText && editor && (
          <div className="absolute -top-12 left-0 bg-white rounded-lg shadow-lg border border-primary-200 flex items-center gap-1 p-1 z-20">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Enter URL:')
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run()
                }
              }}
              isActive={editor.isActive('link')}
              title="Link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </ToolbarButton>
            {richText && (
              <>
                <div className="w-px h-5 bg-primary-200 mx-1" />
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  isActive={editor.isActive('bulletList')}
                  title="Bullet List"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </ToolbarButton>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function ToolbarButton({
  children,
  onClick,
  isActive,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  isActive: boolean
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        w-8 h-8 flex items-center justify-center rounded text-sm
        ${isActive ? 'bg-primary-100 text-primary-900' : 'text-primary-600 hover:bg-primary-50'}
      `}
    >
      {children}
    </button>
  )
}
