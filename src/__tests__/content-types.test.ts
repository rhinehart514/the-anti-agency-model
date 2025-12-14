import {
  PageContentSchema,
  HeroSectionSchema,
  ServicesSectionSchema,
  AboutSectionSchema,
  TestimonialsSectionSchema,
  ContactSectionSchema,
  FooterSectionSchema,
  BrandingSchema,
} from '@/lib/content/types'

describe('Content Type Schemas', () => {
  describe('BrandingSchema', () => {
    it('validates valid branding with all fields', () => {
      const branding = {
        colorScheme: 'blue',
        tone: 'professional' as const,
        industry: 'legal',
      }
      expect(BrandingSchema.safeParse(branding).success).toBe(true)
    })

    it('applies default values', () => {
      const result = BrandingSchema.parse({})
      expect(result.colorScheme).toBe('default')
      expect(result.tone).toBe('professional')
    })

    it('rejects invalid tone values', () => {
      const branding = { tone: 'invalid' }
      expect(BrandingSchema.safeParse(branding).success).toBe(false)
    })
  })

  describe('HeroSectionSchema', () => {
    it('validates valid hero section', () => {
      const hero = {
        type: 'hero' as const,
        headline: 'Welcome',
        subheadline: 'Your trusted partner',
        ctaText: 'Get Started',
        ctaUrl: '/contact',
      }
      expect(HeroSectionSchema.safeParse(hero).success).toBe(true)
    })

    it('allows optional background image', () => {
      const hero = {
        type: 'hero' as const,
        headline: 'Welcome',
        subheadline: 'Your trusted partner',
        ctaText: 'Get Started',
        ctaUrl: '/contact',
        backgroundImage: '/images/hero.jpg',
      }
      expect(HeroSectionSchema.safeParse(hero).success).toBe(true)
    })

    it('rejects missing required fields', () => {
      const hero = {
        type: 'hero' as const,
        headline: 'Welcome',
      }
      expect(HeroSectionSchema.safeParse(hero).success).toBe(false)
    })
  })

  describe('ServicesSectionSchema', () => {
    it('validates services section with multiple services', () => {
      const services = {
        type: 'services' as const,
        headline: 'Our Services',
        subheadline: 'What we offer',
        services: [
          { id: '1', title: 'Service 1', description: 'Description 1', icon: 'icon1' },
          { id: '2', title: 'Service 2', description: 'Description 2', icon: 'icon2' },
        ],
      }
      expect(ServicesSectionSchema.safeParse(services).success).toBe(true)
    })

    it('allows empty services array', () => {
      const services = {
        type: 'services' as const,
        headline: 'Our Services',
        subheadline: 'What we offer',
        services: [],
      }
      expect(ServicesSectionSchema.safeParse(services).success).toBe(true)
    })
  })

  describe('AboutSectionSchema', () => {
    it('validates about section with stats and team', () => {
      const about = {
        type: 'about' as const,
        headline: 'About Us',
        description: 'We are a trusted firm.',
        stats: [
          { label: 'Years', value: '25+' },
          { label: 'Clients', value: '1000+' },
        ],
        team: [
          { id: '1', name: 'John Doe', title: 'CEO' },
        ],
      }
      expect(AboutSectionSchema.safeParse(about).success).toBe(true)
    })

    it('allows optional team', () => {
      const about = {
        type: 'about' as const,
        headline: 'About Us',
        description: 'We are a trusted firm.',
        stats: [],
      }
      expect(AboutSectionSchema.safeParse(about).success).toBe(true)
    })
  })

  describe('TestimonialsSectionSchema', () => {
    it('validates testimonials section', () => {
      const testimonials = {
        type: 'testimonials' as const,
        headline: 'What Our Clients Say',
        testimonials: [
          { id: '1', quote: 'Great service!', author: 'Jane', role: 'CEO' },
        ],
      }
      expect(TestimonialsSectionSchema.safeParse(testimonials).success).toBe(true)
    })
  })

  describe('ContactSectionSchema', () => {
    it('validates contact section', () => {
      const contact = {
        type: 'contact' as const,
        headline: 'Contact Us',
        subheadline: 'Get in touch',
        contactInfo: {
          address: '123 Main St',
          phone: '555-1234',
          email: 'info@example.com',
          hours: 'Mon-Fri 9-5',
        },
      }
      expect(ContactSectionSchema.safeParse(contact).success).toBe(true)
    })
  })

  describe('FooterSectionSchema', () => {
    it('validates footer section', () => {
      const footer = {
        type: 'footer' as const,
        firmName: 'Example Corp',
        tagline: 'Your trusted partner',
        contactInfo: {
          phone: '555-1234',
          email: 'info@example.com',
          address: '123 Main St',
        },
      }
      expect(FooterSectionSchema.safeParse(footer).success).toBe(true)
    })
  })

  describe('PageContentSchema', () => {
    it('validates complete page content', () => {
      const pageContent = {
        siteInfo: {
          firmName: 'Test Firm',
          phone: '555-1234',
          email: 'test@example.com',
          address: '123 Test St',
        },
        sections: [
          {
            type: 'hero' as const,
            headline: 'Welcome',
            subheadline: 'Test',
            ctaText: 'Contact',
            ctaUrl: '/contact',
          },
        ],
        branding: {
          colorScheme: 'default',
          tone: 'professional' as const,
        },
      }
      expect(PageContentSchema.safeParse(pageContent).success).toBe(true)
    })

    it('rejects invalid section types in discriminated union', () => {
      const pageContent = {
        siteInfo: {
          firmName: 'Test Firm',
          phone: '555-1234',
          email: 'test@example.com',
          address: '123 Test St',
        },
        sections: [
          {
            type: 'invalid_type',
            headline: 'Welcome',
          },
        ],
      }
      expect(PageContentSchema.safeParse(pageContent).success).toBe(false)
    })

    it('rejects missing siteInfo', () => {
      const pageContent = {
        sections: [],
      }
      expect(PageContentSchema.safeParse(pageContent).success).toBe(false)
    })
  })
})
