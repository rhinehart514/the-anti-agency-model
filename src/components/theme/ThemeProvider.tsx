'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

// ============================================
// Color Schemes
// ============================================

export interface ColorScheme {
  id: string
  name: string
  primary: string
  primaryLight: string
  primaryDark: string
  accent: string
  accentLight: string
  background: string
}

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    primary: '#1e3a5f',
    primaryLight: '#2d5a8a',
    primaryDark: '#142740',
    accent: '#c9a227',
    accentLight: '#dbb84a',
    background: '#f8fafc',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    primary: '#334155',
    primaryLight: '#475569',
    primaryDark: '#1e293b',
    accent: '#3b82f6',
    accentLight: '#60a5fa',
    background: '#ffffff',
  },
  warm: {
    id: 'warm',
    name: 'Warm',
    primary: '#7f1d1d',
    primaryLight: '#991b1b',
    primaryDark: '#450a0a',
    accent: '#f59e0b',
    accentLight: '#fbbf24',
    background: '#fef7ed',
  },
  fresh: {
    id: 'fresh',
    name: 'Fresh',
    primary: '#166534',
    primaryLight: '#15803d',
    primaryDark: '#14532d',
    accent: '#22c55e',
    accentLight: '#4ade80',
    background: '#f0fdf4',
  },
  bold: {
    id: 'bold',
    name: 'Bold',
    primary: '#171717',
    primaryLight: '#262626',
    primaryDark: '#0a0a0a',
    accent: '#f97316',
    accentLight: '#fb923c',
    background: '#fafaf9',
  },
  calm: {
    id: 'calm',
    name: 'Calm',
    primary: '#0f766e',
    primaryLight: '#0d9488',
    primaryDark: '#134e4a',
    accent: '#14b8a6',
    accentLight: '#2dd4bf',
    background: '#f5f5f4',
  },
  default: {
    id: 'default',
    name: 'Default',
    primary: '#243b53',
    primaryLight: '#334e68',
    primaryDark: '#102a43',
    accent: '#dd6b20',
    accentLight: '#ed8936',
    background: '#f0f4f8',
  },
}

// ============================================
// Theme Context
// ============================================

interface ThemeContextType {
  colorScheme: ColorScheme
  cssVariables: Record<string, string>
}

const ThemeContext = createContext<ThemeContextType | null>(null)

interface ThemeProviderProps {
  children: ReactNode
  colorSchemeId?: string
}

export function ThemeProvider({ children, colorSchemeId = 'default' }: ThemeProviderProps) {
  const colorScheme = COLOR_SCHEMES[colorSchemeId] || COLOR_SCHEMES.default

  const cssVariables = useMemo(() => ({
    '--color-primary': colorScheme.primary,
    '--color-primary-light': colorScheme.primaryLight,
    '--color-primary-dark': colorScheme.primaryDark,
    '--color-accent': colorScheme.accent,
    '--color-accent-light': colorScheme.accentLight,
    '--color-background': colorScheme.background,
  }), [colorScheme])

  return (
    <ThemeContext.Provider value={{ colorScheme, cssVariables }}>
      <div style={cssVariables as React.CSSProperties}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Helper to get color scheme
export function getColorScheme(id: string): ColorScheme {
  return COLOR_SCHEMES[id] || COLOR_SCHEMES.default
}
