'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

// ============================================
// Types
// ============================================

export interface ServiceItem {
  id: string
  title: string
  description: string
  icon: string
}

export interface StatItem {
  label: string
  value: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  image?: string
}

export interface WizardState {
  currentStep: number
  industry: string | null
  businessInfo: {
    name: string
    phone: string
    email: string
    address: string
    tagline: string
  }
  services: ServiceItem[]
  about: {
    description: string
    stats: StatItem[]
    teamMembers: TeamMember[]
  }
  branding: {
    colorScheme: string
    tone: 'professional' | 'friendly' | 'bold' | 'traditional'
  }
}

interface WizardContextType {
  state: WizardState
  currentStep: number
  totalSteps: number
  canGoNext: boolean
  canGoBack: boolean
  goNext: () => void
  goBack: () => void
  goToStep: (step: number) => void
  setIndustry: (industry: string) => void
  setBusinessInfo: (info: Partial<WizardState['businessInfo']>) => void
  setServices: (services: ServiceItem[]) => void
  addService: (service: Omit<ServiceItem, 'id'>) => void
  removeService: (id: string) => void
  updateService: (id: string, updates: Partial<ServiceItem>) => void
  setAbout: (about: Partial<WizardState['about']>) => void
  addStat: (stat: StatItem) => void
  removeStat: (index: number) => void
  addTeamMember: (member: Omit<TeamMember, 'id'>) => void
  removeTeamMember: (id: string) => void
  setBranding: (branding: Partial<WizardState['branding']>) => void
  isStepComplete: (step: number) => boolean
}

// ============================================
// Initial State
// ============================================

const initialState: WizardState = {
  currentStep: 0,
  industry: null,
  businessInfo: {
    name: '',
    phone: '',
    email: '',
    address: '',
    tagline: '',
  },
  services: [],
  about: {
    description: '',
    stats: [],
    teamMembers: [],
  },
  branding: {
    colorScheme: 'default',
    tone: 'professional',
  },
}

// ============================================
// Context
// ============================================

const WizardContext = createContext<WizardContextType | null>(null)

// ============================================
// Provider
// ============================================

const TOTAL_STEPS = 6

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState)

  // Navigation
  const goNext = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
    }))
  }, [])

  const goBack = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }))
  }, [])

  const goToStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)),
    }))
  }, [])

  // Industry
  const setIndustry = useCallback((industry: string) => {
    setState(prev => ({ ...prev, industry }))
  }, [])

  // Business Info
  const setBusinessInfo = useCallback((info: Partial<WizardState['businessInfo']>) => {
    setState(prev => ({
      ...prev,
      businessInfo: { ...prev.businessInfo, ...info },
    }))
  }, [])

  // Services
  const setServices = useCallback((services: ServiceItem[]) => {
    setState(prev => ({ ...prev, services }))
  }, [])

  const addService = useCallback((service: Omit<ServiceItem, 'id'>) => {
    setState(prev => ({
      ...prev,
      services: [...prev.services, { ...service, id: crypto.randomUUID() }],
    }))
  }, [])

  const removeService = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id),
    }))
  }, [])

  const updateService = useCallback((id: string, updates: Partial<ServiceItem>) => {
    setState(prev => ({
      ...prev,
      services: prev.services.map(s => (s.id === id ? { ...s, ...updates } : s)),
    }))
  }, [])

  // About
  const setAbout = useCallback((about: Partial<WizardState['about']>) => {
    setState(prev => ({
      ...prev,
      about: { ...prev.about, ...about },
    }))
  }, [])

  const addStat = useCallback((stat: StatItem) => {
    setState(prev => ({
      ...prev,
      about: { ...prev.about, stats: [...prev.about.stats, stat] },
    }))
  }, [])

  const removeStat = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      about: {
        ...prev.about,
        stats: prev.about.stats.filter((_, i) => i !== index),
      },
    }))
  }, [])

  const addTeamMember = useCallback((member: Omit<TeamMember, 'id'>) => {
    setState(prev => ({
      ...prev,
      about: {
        ...prev.about,
        teamMembers: [...prev.about.teamMembers, { ...member, id: crypto.randomUUID() }],
      },
    }))
  }, [])

  const removeTeamMember = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      about: {
        ...prev.about,
        teamMembers: prev.about.teamMembers.filter(m => m.id !== id),
      },
    }))
  }, [])

  // Branding
  const setBranding = useCallback((branding: Partial<WizardState['branding']>) => {
    setState(prev => ({
      ...prev,
      branding: { ...prev.branding, ...branding },
    }))
  }, [])

  // Validation
  const isStepComplete = useCallback((step: number): boolean => {
    switch (step) {
      case 0: // Industry
        return state.industry !== null
      case 1: // Business Info
        return (
          state.businessInfo.name.trim() !== '' &&
          state.businessInfo.email.trim() !== ''
        )
      case 2: // Services
        return state.services.length > 0
      case 3: // About
        return state.about.description.trim() !== ''
      case 4: // Branding
        return true // Always valid
      case 5: // Review
        return true // Always valid
      default:
        return false
    }
  }, [state])

  const canGoNext = isStepComplete(state.currentStep)
  const canGoBack = state.currentStep > 0

  return (
    <WizardContext.Provider
      value={{
        state,
        currentStep: state.currentStep,
        totalSteps: TOTAL_STEPS,
        canGoNext,
        canGoBack,
        goNext,
        goBack,
        goToStep,
        setIndustry,
        setBusinessInfo,
        setServices,
        addService,
        removeService,
        updateService,
        setAbout,
        addStat,
        removeStat,
        addTeamMember,
        removeTeamMember,
        setBranding,
        isStepComplete,
      }}
    >
      {children}
    </WizardContext.Provider>
  )
}

// ============================================
// Hook
// ============================================

export function useWizard() {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}
