import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toBe('px-4 py-2')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toBe('base-class active-class')
  })

  it('removes falsy values', () => {
    const result = cn('base', false, null, undefined, 'valid')
    expect(result).toBe('base valid')
  })

  it('merges conflicting Tailwind classes correctly', () => {
    // tw-merge should keep the later class
    const result = cn('px-4', 'px-8')
    expect(result).toBe('px-8')
  })

  it('handles array of classes', () => {
    const result = cn(['class-1', 'class-2'], 'class-3')
    expect(result).toBe('class-1 class-2 class-3')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('merges complex Tailwind classes', () => {
    const result = cn(
      'text-sm font-medium',
      'text-lg', // should override text-sm
      'hover:bg-gray-100'
    )
    expect(result).toBe('font-medium text-lg hover:bg-gray-100')
  })
})
