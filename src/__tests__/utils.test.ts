describe('Utility Functions', () => {
  describe('Slug Validation', () => {
    const isValidSlug = (slug: string) => /^[a-z0-9-]+$/.test(slug)

    it('accepts valid slugs', () => {
      expect(isValidSlug('my-site')).toBe(true)
      expect(isValidSlug('site123')).toBe(true)
      expect(isValidSlug('my-cool-site-2024')).toBe(true)
      expect(isValidSlug('a')).toBe(true)
    })

    it('rejects invalid slugs', () => {
      expect(isValidSlug('My-Site')).toBe(false) // uppercase
      expect(isValidSlug('my site')).toBe(false) // spaces
      expect(isValidSlug('my_site')).toBe(false) // underscores
      expect(isValidSlug('my.site')).toBe(false) // dots
      expect(isValidSlug('')).toBe(false) // empty
      expect(isValidSlug('site@123')).toBe(false) // special chars
    })
  })

  describe('Email Validation', () => {
    const isValidEmail = (email: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    it('accepts valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@company.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('rejects invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user @example.com')).toBe(false)
    })
  })

  describe('Phone Formatting', () => {
    const formatPhone = (phone: string) => {
      const digits = phone.replace(/\D/g, '')
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      }
      return phone
    }

    it('formats 10-digit phone numbers', () => {
      expect(formatPhone('5551234567')).toBe('(555) 123-4567')
      expect(formatPhone('555-123-4567')).toBe('(555) 123-4567')
      expect(formatPhone('(555) 123-4567')).toBe('(555) 123-4567')
    })

    it('preserves non-standard phone formats', () => {
      expect(formatPhone('+1 555-123-4567')).toBe('+1 555-123-4567')
      expect(formatPhone('123')).toBe('123')
    })
  })
})

describe('Content Defaults', () => {
  it('should provide valid default content structure', async () => {
    const { DEFAULT_LAW_FIRM_CONTENT } = await import('@/lib/content/defaults')
    const { PageContentSchema } = await import('@/lib/content/types')

    const validation = PageContentSchema.safeParse(DEFAULT_LAW_FIRM_CONTENT)
    expect(validation.success).toBe(true)
  })

  it('should have all required sections in default content', async () => {
    const { DEFAULT_LAW_FIRM_CONTENT } = await import('@/lib/content/defaults')

    const sectionTypes = DEFAULT_LAW_FIRM_CONTENT.sections.map((s) => s.type)
    expect(sectionTypes).toContain('hero')
    expect(sectionTypes).toContain('services')
    expect(sectionTypes).toContain('about')
    expect(sectionTypes).toContain('testimonials')
    expect(sectionTypes).toContain('contact')
    expect(sectionTypes).toContain('footer')
  })

  it('should have valid siteInfo in default content', async () => {
    const { DEFAULT_LAW_FIRM_CONTENT } = await import('@/lib/content/defaults')

    expect(DEFAULT_LAW_FIRM_CONTENT.siteInfo.firmName).toBeTruthy()
    expect(DEFAULT_LAW_FIRM_CONTENT.siteInfo.phone).toBeTruthy()
    expect(DEFAULT_LAW_FIRM_CONTENT.siteInfo.email).toBeTruthy()
    expect(DEFAULT_LAW_FIRM_CONTENT.siteInfo.address).toBeTruthy()
  })
})
