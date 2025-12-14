import { getContactNotificationEmail } from '@/lib/email/templates'
import type { ContactNotificationData } from '@/lib/email/types'

describe('Email Templates', () => {
  const mockData: ContactNotificationData = {
    siteName: 'Test Law Firm',
    siteSlug: 'test-law-firm',
    submitterName: 'John Doe',
    submitterEmail: 'john@example.com',
    submitterPhone: '555-123-4567',
    message: 'Hello, I would like to schedule a consultation.',
    submittedAt: new Date('2024-01-15T10:30:00'),
  }

  describe('getContactNotificationEmail', () => {
    it('should generate email with correct subject', () => {
      const { subject } = getContactNotificationEmail(mockData)

      expect(subject).toContain('John Doe')
      expect(subject).toContain('Test Law Firm')
      expect(subject).toContain('contact form submission')
    })

    it('should include all contact details in HTML', () => {
      const { html } = getContactNotificationEmail(mockData)

      expect(html).toContain('John Doe')
      expect(html).toContain('john@example.com')
      expect(html).toContain('555-123-4567')
      expect(html).toContain('Hello, I would like to schedule a consultation.')
    })

    it('should include all contact details in plain text', () => {
      const { text } = getContactNotificationEmail(mockData)

      expect(text).toContain('John Doe')
      expect(text).toContain('john@example.com')
      expect(text).toContain('555-123-4567')
      expect(text).toContain('Hello, I would like to schedule a consultation.')
    })

    it('should handle missing phone number', () => {
      const dataWithoutPhone: ContactNotificationData = {
        ...mockData,
        submitterPhone: undefined,
      }

      const { html, text } = getContactNotificationEmail(dataWithoutPhone)

      expect(html).not.toContain('555-123-4567')
      expect(text).not.toContain('Phone:')
    })

    it('should escape HTML in user input', () => {
      const maliciousData: ContactNotificationData = {
        ...mockData,
        submitterName: '<script>alert("xss")</script>',
        message: '<img src="x" onerror="alert(1)">',
      }

      const { html } = getContactNotificationEmail(maliciousData)

      // Verify dangerous tags are escaped (not raw HTML)
      expect(html).not.toContain('<script>')
      expect(html).not.toContain('<img ')
      // Verify the escaped versions are present
      expect(html).toContain('&lt;script&gt;')
      expect(html).toContain('&lt;img')
    })

    it('should include reply-to link', () => {
      const { html } = getContactNotificationEmail(mockData)

      expect(html).toContain('mailto:john@example.com')
      expect(html).toContain('Reply to John Doe')
    })

    it('should format date correctly', () => {
      const { html, text } = getContactNotificationEmail(mockData)

      // Should contain formatted date (locale dependent, but check for common parts)
      expect(html).toMatch(/January|2024/)
      expect(text).toMatch(/January|2024/)
    })

    it('should include site name in header', () => {
      const { html } = getContactNotificationEmail(mockData)

      expect(html).toContain('Test Law Firm')
      expect(html).toContain('New Contact Form Submission')
    })

    it('should preserve message whitespace', () => {
      const dataWithMultilineMessage: ContactNotificationData = {
        ...mockData,
        message: 'Line 1\n\nLine 2\nLine 3',
      }

      const { html } = getContactNotificationEmail(dataWithMultilineMessage)

      expect(html).toContain('white-space: pre-wrap')
    })
  })
})
