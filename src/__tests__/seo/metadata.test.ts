import { generateSiteMetadata, generateStructuredData } from '@/lib/seo/metadata'
import type { PageContent } from '@/lib/content/types'

const mockContent: PageContent = {
  siteInfo: {
    firmName: 'Test Law Firm',
    phone: '555-123-4567',
    email: 'info@testlawfirm.com',
    address: '123 Legal Street, San Francisco, CA 94102',
  },
  branding: {
    colorScheme: 'professional',
    tone: 'professional',
    industry: 'law-firm',
  },
  sections: [
    {
      type: 'hero',
      headline: 'Trusted Legal Counsel',
      subheadline: 'Expert legal representation for over 25 years.',
      ctaText: 'Contact Us',
      ctaUrl: '#contact',
    },
    {
      type: 'services',
      headline: 'Our Services',
      subheadline: 'What we offer',
      services: [
        { id: '1', title: 'Personal Injury', description: 'Test', icon: 'shield' },
        { id: '2', title: 'Business Law', description: 'Test', icon: 'briefcase' },
      ],
    },
    {
      type: 'about',
      headline: 'About Us',
      description: 'We are a trusted firm.',
      stats: [],
    },
    {
      type: 'testimonials',
      headline: 'Testimonials',
      testimonials: [],
    },
    {
      type: 'contact',
      headline: 'Contact Us',
      subheadline: 'Get in touch',
      contactInfo: {
        address: '123 Legal Street',
        phone: '555-123-4567',
        email: 'info@test.com',
        hours: 'Mon-Fri 9-5',
      },
    },
    {
      type: 'footer',
      firmName: 'Test Law Firm',
      tagline: 'Your trusted partner',
      contactInfo: {
        phone: '555-123-4567',
        email: 'info@test.com',
        address: '123 Legal Street',
      },
    },
  ],
}

describe('SEO Metadata Generation', () => {
  describe('generateSiteMetadata', () => {
    it('should generate valid metadata from content', () => {
      const metadata = generateSiteMetadata({
        siteSlug: 'test-law-firm',
        content: mockContent,
        baseUrl: 'https://example.com',
      })

      expect(metadata.title).toBe('Test Law Firm')
      expect(metadata.description).toBe('Expert legal representation for over 25 years.')
    })

    it('should generate OpenGraph metadata', () => {
      const metadata = generateSiteMetadata({
        siteSlug: 'test-law-firm',
        content: mockContent,
        baseUrl: 'https://example.com',
      })

      expect(metadata.openGraph).toBeDefined()
      expect(metadata.openGraph?.title).toBe('Test Law Firm')
      expect(metadata.openGraph?.url).toBe('https://example.com/sites/test-law-firm')
      expect(metadata.openGraph?.type).toBe('website')
    })

    it('should generate Twitter card metadata', () => {
      const metadata = generateSiteMetadata({
        siteSlug: 'test-law-firm',
        content: mockContent,
        baseUrl: 'https://example.com',
      })

      expect(metadata.twitter).toBeDefined()
      expect(metadata.twitter?.card).toBe('summary_large_image')
      expect(metadata.twitter?.title).toBe('Test Law Firm')
    })

    it('should set correct robots configuration', () => {
      const metadata = generateSiteMetadata({
        siteSlug: 'test-law-firm',
        content: mockContent,
      })

      expect(metadata.robots).toBeDefined()
      expect((metadata.robots as { index: boolean }).index).toBe(true)
      expect((metadata.robots as { follow: boolean }).follow).toBe(true)
    })

    it('should generate keywords from content', () => {
      const metadata = generateSiteMetadata({
        siteSlug: 'test-law-firm',
        content: mockContent,
      })

      expect(metadata.keywords).toBeDefined()
      expect(Array.isArray(metadata.keywords)).toBe(true)
      expect(metadata.keywords).toContain('Test Law Firm')
      expect(metadata.keywords).toContain('Personal Injury')
    })

    it('should use default baseUrl when not provided', () => {
      const metadata = generateSiteMetadata({
        siteSlug: 'test-law-firm',
        content: mockContent,
      })

      expect(metadata.alternates?.canonical).toContain('/sites/test-law-firm')
    })

    it('should handle content without hero section', () => {
      const contentWithoutHero: PageContent = {
        ...mockContent,
        sections: mockContent.sections.filter((s) => s.type !== 'hero'),
      }

      const metadata = generateSiteMetadata({
        siteSlug: 'test-law-firm',
        content: contentWithoutHero,
      })

      expect(metadata.title).toBe('Test Law Firm')
      expect(metadata.description).toContain('Welcome to Test Law Firm')
    })
  })

  describe('generateStructuredData', () => {
    it('should generate valid JSON-LD structure', () => {
      const structuredData = generateStructuredData(mockContent, 'test-law-firm')

      expect(structuredData['@context']).toBe('https://schema.org')
      expect(structuredData['@type']).toBeDefined()
      expect(structuredData.name).toBe('Test Law Firm')
    })

    it('should use correct schema type for law firm', () => {
      const structuredData = generateStructuredData(mockContent, 'test-law-firm')

      expect(structuredData['@type']).toBe('LegalService')
    })

    it('should use correct schema type for medical practice', () => {
      const medicalContent: PageContent = {
        ...mockContent,
        branding: { ...mockContent.branding!, industry: 'medical' },
      }

      const structuredData = generateStructuredData(medicalContent, 'test-medical')

      expect(structuredData['@type']).toBe('MedicalBusiness')
    })

    it('should use correct schema type for restaurant', () => {
      const restaurantContent: PageContent = {
        ...mockContent,
        branding: { ...mockContent.branding!, industry: 'restaurant' },
      }

      const structuredData = generateStructuredData(restaurantContent, 'test-restaurant')

      expect(structuredData['@type']).toBe('Restaurant')
    })

    it('should default to LocalBusiness for unknown industries', () => {
      const unknownContent: PageContent = {
        ...mockContent,
        branding: { ...mockContent.branding!, industry: 'unknown' },
      }

      const structuredData = generateStructuredData(unknownContent, 'test-unknown')

      expect(structuredData['@type']).toBe('LocalBusiness')
    })

    it('should include contact information', () => {
      const structuredData = generateStructuredData(mockContent, 'test-law-firm')

      expect(structuredData.telephone).toBe('555-123-4567')
      expect(structuredData.email).toBe('info@testlawfirm.com')
    })

    it('should include address when available', () => {
      const structuredData = generateStructuredData(mockContent, 'test-law-firm')

      expect(structuredData.address).toBeDefined()
      expect(structuredData.address['@type']).toBe('PostalAddress')
    })

    it('should include URL', () => {
      const structuredData = generateStructuredData(mockContent, 'test-law-firm')

      expect(structuredData.url).toContain('/sites/test-law-firm')
    })
  })
})
