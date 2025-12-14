'use client'

import { useState } from 'react'
import { useEditMode } from './EditModeProvider'
import { EditTab } from './sidebar/EditTab'
import { AgentTab } from './sidebar/AgentTab'
import { HelpTab } from './sidebar/HelpTab'

type TabId = 'edit' | 'agent' | 'help'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
  badge?: number
}

export function Sidebar() {
  const { isEditMode } = useEditMode()
  const [activeTab, setActiveTab] = useState<TabId>('edit')
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Mock agent alerts for demo
  const agentAlerts = 3

  const tabs: Tab[] = [
    {
      id: 'edit',
      label: 'Edit',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    {
      id: 'agent',
      label: 'Agent',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      badge: agentAlerts,
    },
    {
      id: 'help',
      label: 'Help',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ]

  if (!isEditMode) return null

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-primary-900 text-white p-3 rounded-l-lg shadow-lg hover:bg-primary-800 transition-colors"
          title="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {agentAlerts > 0 && (
            <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {agentAlerts}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-primary-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary-200">
        <h2 className="font-semibold text-primary-900">Site Assistant</h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-primary-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors relative
              ${activeTab === tab.id
                ? 'text-primary-900 border-b-2 border-primary-900 bg-primary-50'
                : 'text-primary-500 hover:text-primary-700 hover:bg-primary-50'
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'edit' && <EditTab />}
        {activeTab === 'agent' && <AgentTab />}
        {activeTab === 'help' && <HelpTab />}
      </div>
    </div>
  )
}
