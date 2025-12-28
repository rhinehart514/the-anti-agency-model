import { describe, it, expect } from 'vitest'
import {
  ThemeSchema,
  ColorScaleSchema,
  generateColorVars,
  generateTypographyVars,
  generateThemeVars,
  type ThemeColors,
  type ThemeTypography,
  type Theme,
} from '../themes/types'

describe('Theme Schemas', () => {
  describe('ColorScaleSchema', () => {
    it('validates a complete color scale', () => {
      const colorScale = {
        50: '#fafafa',
        100: '#f4f4f5',
        200: '#e4e4e7',
        300: '#d4d4d8',
        400: '#a1a1aa',
        500: '#71717a',
        600: '#52525b',
        700: '#3f3f46',
        800: '#27272a',
        900: '#18181b',
      }
      const result = ColorScaleSchema.safeParse(colorScale)
      expect(result.success).toBe(true)
    })

    it('validates minimal color scale (500, 600 required)', () => {
      const minimalScale = {
        500: '#71717a',
        600: '#52525b',
      }
      const result = ColorScaleSchema.safeParse(minimalScale)
      expect(result.success).toBe(true)
    })

    it('fails without required 500 shade', () => {
      const invalid = { 600: '#52525b' }
      const result = ColorScaleSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('ThemeSchema', () => {
    const validTheme: Theme = {
      id: 'test-theme',
      name: 'Test Theme',
      slug: 'test-theme',
      colors: {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        secondary: { 500: '#6b7280', 600: '#4b5563' },
        accent: { 500: '#f59e0b', 600: '#d97706' },
        background: '#ffffff',
        foreground: '#000000',
      },
      typography: {
        fontFamily: {
          heading: 'Inter, sans-serif',
          body: 'Inter, sans-serif',
        },
        fontSize: {
          base: '16px',
        },
      },
    }

    it('validates a complete theme', () => {
      const result = ThemeSchema.safeParse(validTheme)
      expect(result.success).toBe(true)
    })

    it('fails without required fields', () => {
      const invalid = { id: 'test' }
      const result = ThemeSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })
})

describe('CSS Variable Generation', () => {
  const testColors: ThemeColors = {
    primary: { 500: '#3b82f6', 600: '#2563eb' },
    secondary: { 500: '#6b7280', 600: '#4b5563' },
    accent: { 500: '#f59e0b', 600: '#d97706' },
    background: '#ffffff',
    foreground: '#000000',
    muted: '#f4f4f5',
    success: '#22c55e',
  }

  const testTypography: ThemeTypography = {
    fontFamily: {
      heading: 'Inter, sans-serif',
      body: 'System UI, sans-serif',
      mono: 'Fira Code, monospace',
    },
    fontSize: {
      base: '16px',
      lg: '18px',
      xl: '20px',
    },
    fontWeight: {
      normal: 400,
      bold: 700,
    },
  }

  describe('generateColorVars', () => {
    it('generates color CSS variables', () => {
      const vars = generateColorVars(testColors)

      expect(vars['--color-primary-500']).toBe('#3b82f6')
      expect(vars['--color-primary-600']).toBe('#2563eb')
      expect(vars['--color-secondary-500']).toBe('#6b7280')
      expect(vars['--color-accent-500']).toBe('#f59e0b')
      expect(vars['--color-background']).toBe('#ffffff')
      expect(vars['--color-foreground']).toBe('#000000')
      expect(vars['--color-muted']).toBe('#f4f4f5')
      expect(vars['--color-success']).toBe('#22c55e')
    })

    it('omits undefined optional colors', () => {
      const vars = generateColorVars(testColors)
      expect(vars['--color-warning']).toBeUndefined()
      expect(vars['--color-error']).toBeUndefined()
    })

    it('generates all optional semantic colors when provided', () => {
      const fullColors: ThemeColors = {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        secondary: { 500: '#6b7280', 600: '#4b5563' },
        accent: { 500: '#f59e0b', 600: '#d97706' },
        background: '#ffffff',
        foreground: '#000000',
        muted: '#f4f4f5',
        mutedForeground: '#71717a',
        card: '#fafafa',
        cardForeground: '#1a1a1a',
        border: '#e5e5e5',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      }
      const vars = generateColorVars(fullColors)

      expect(vars['--color-muted']).toBe('#f4f4f5')
      expect(vars['--color-muted-foreground']).toBe('#71717a')
      expect(vars['--color-card']).toBe('#fafafa')
      expect(vars['--color-card-foreground']).toBe('#1a1a1a')
      expect(vars['--color-border']).toBe('#e5e5e5')
      expect(vars['--color-success']).toBe('#22c55e')
      expect(vars['--color-warning']).toBe('#f59e0b')
      expect(vars['--color-error']).toBe('#ef4444')
    })

    it('handles full color scales with all shades', () => {
      const fullScaleColors: ThemeColors = {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: { 500: '#6b7280', 600: '#4b5563' },
        accent: { 500: '#f59e0b', 600: '#d97706' },
        background: '#ffffff',
        foreground: '#000000',
      }
      const vars = generateColorVars(fullScaleColors)

      expect(vars['--color-primary-50']).toBe('#eff6ff')
      expect(vars['--color-primary-100']).toBe('#dbeafe')
      expect(vars['--color-primary-900']).toBe('#1e3a8a')
    })

    it('skips undefined values in color scales', () => {
      const colorsWithUndefined: ThemeColors = {
        primary: { 500: '#3b82f6', 600: '#2563eb', 50: undefined },
        secondary: { 500: '#6b7280', 600: '#4b5563' },
        accent: { 500: '#f59e0b', 600: '#d97706' },
        background: '#ffffff',
        foreground: '#000000',
      }
      const vars = generateColorVars(colorsWithUndefined)

      expect(vars['--color-primary-50']).toBeUndefined()
      expect(vars['--color-primary-500']).toBe('#3b82f6')
    })

    it('skips undefined values in secondary and accent color scales', () => {
      const colorsWithUndefined: ThemeColors = {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        secondary: { 500: '#6b7280', 600: '#4b5563', 50: undefined, 100: '#f4f4f5' },
        accent: { 500: '#f59e0b', 600: '#d97706', 50: undefined, 100: '#fef3c7' },
        background: '#ffffff',
        foreground: '#000000',
      }
      const vars = generateColorVars(colorsWithUndefined)

      expect(vars['--color-secondary-50']).toBeUndefined()
      expect(vars['--color-secondary-100']).toBe('#f4f4f5')
      expect(vars['--color-accent-50']).toBeUndefined()
      expect(vars['--color-accent-100']).toBe('#fef3c7')
    })
  })

  describe('generateTypographyVars', () => {
    it('generates typography CSS variables', () => {
      const vars = generateTypographyVars(testTypography)

      expect(vars['--font-heading']).toBe('Inter, sans-serif')
      expect(vars['--font-body']).toBe('System UI, sans-serif')
      expect(vars['--font-mono']).toBe('Fira Code, monospace')
      expect(vars['--font-size-base']).toBe('16px')
      expect(vars['--font-size-lg']).toBe('18px')
      expect(vars['--font-weight-normal']).toBe('400')
      expect(vars['--font-weight-bold']).toBe('700')
    })

    it('generates lineHeight CSS variables when provided', () => {
      const typographyWithLineHeight: ThemeTypography = {
        fontFamily: {
          heading: 'Inter',
          body: 'Inter',
        },
        fontSize: { base: '16px' },
        lineHeight: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75,
        },
      }
      const vars = generateTypographyVars(typographyWithLineHeight)

      expect(vars['--line-height-tight']).toBe('1.25')
      expect(vars['--line-height-normal']).toBe('1.5')
      expect(vars['--line-height-relaxed']).toBe('1.75')
    })

    it('handles missing optional typography properties', () => {
      const minimalTypography: ThemeTypography = {
        fontFamily: {
          heading: 'Arial',
          body: 'Arial',
        },
        fontSize: { base: '14px' },
      }
      const vars = generateTypographyVars(minimalTypography)

      expect(vars['--font-heading']).toBe('Arial')
      expect(vars['--font-body']).toBe('Arial')
      expect(vars['--font-mono']).toBeUndefined()
      expect(vars['--font-weight-normal']).toBeUndefined()
      expect(vars['--line-height-normal']).toBeUndefined()
    })

    it('handles partial lineHeight with some undefined values', () => {
      const typographyPartialLineHeight: ThemeTypography = {
        fontFamily: { heading: 'Inter', body: 'Inter' },
        fontSize: { base: '16px' },
        lineHeight: {
          normal: 1.5,
          // tight and relaxed are undefined
        },
      }
      const vars = generateTypographyVars(typographyPartialLineHeight)

      expect(vars['--line-height-normal']).toBe('1.5')
      expect(vars['--line-height-tight']).toBeUndefined()
      expect(vars['--line-height-relaxed']).toBeUndefined()
    })

    it('skips undefined font size values', () => {
      const typographyWithUndefinedSizes: ThemeTypography = {
        fontFamily: { heading: 'Inter', body: 'Inter' },
        fontSize: { base: '16px', lg: undefined, xl: '20px' },
      }
      const vars = generateTypographyVars(typographyWithUndefinedSizes)

      expect(vars['--font-size-base']).toBe('16px')
      expect(vars['--font-size-lg']).toBeUndefined()
      expect(vars['--font-size-xl']).toBe('20px')
    })

    it('skips undefined font weight values', () => {
      const typographyWithUndefinedWeights: ThemeTypography = {
        fontFamily: { heading: 'Inter', body: 'Inter' },
        fontSize: { base: '16px' },
        fontWeight: { normal: 400, bold: undefined },
      }
      const vars = generateTypographyVars(typographyWithUndefinedWeights)

      expect(vars['--font-weight-normal']).toBe('400')
      expect(vars['--font-weight-bold']).toBeUndefined()
    })

    it('skips undefined line height values', () => {
      const typographyWithUndefinedLineHeight: ThemeTypography = {
        fontFamily: { heading: 'Inter', body: 'Inter' },
        fontSize: { base: '16px' },
        lineHeight: { tight: 1.2, normal: undefined, relaxed: 1.8 },
      }
      const vars = generateTypographyVars(typographyWithUndefinedLineHeight)

      expect(vars['--line-height-tight']).toBe('1.2')
      expect(vars['--line-height-normal']).toBeUndefined()
      expect(vars['--line-height-relaxed']).toBe('1.8')
    })
  })

  describe('generateThemeVars', () => {
    it('combines color and typography vars', () => {
      const theme: Theme = {
        id: 'test',
        name: 'Test',
        slug: 'test',
        colors: testColors,
        typography: testTypography,
      }

      const vars = generateThemeVars(theme)

      // Should have both color and typography vars
      expect(vars['--color-primary-500']).toBe('#3b82f6')
      expect(vars['--font-heading']).toBe('Inter, sans-serif')
    })
  })
})
