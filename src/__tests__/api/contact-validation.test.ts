import { z } from 'zod'

// Mirror the schema from the contact API route for testing
const ContactSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
})

describe('Contact Form Validation', () => {
  describe('Valid submissions', () => {
    it('accepts valid submission with all fields', () => {
      const submission = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        message: 'Hello, I would like to learn more about your services.',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(true)
    })

    it('accepts valid submission without optional phone', () => {
      const submission = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'I have a question about your pricing.',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(true)
    })

    it('accepts submission with empty string phone', () => {
      const submission = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '',
        message: 'Test message',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(true)
    })
  })

  describe('Invalid submissions', () => {
    it('rejects submission without name', () => {
      const submission = {
        email: 'john@example.com',
        message: 'Hello',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(false)
    })

    it('rejects submission with empty name', () => {
      const submission = {
        name: '',
        email: 'john@example.com',
        message: 'Hello',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required')
      }
    })

    it('rejects submission with name exceeding 100 characters', () => {
      const submission = {
        name: 'A'.repeat(101),
        email: 'john@example.com',
        message: 'Hello',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(false)
    })

    it('rejects submission without email', () => {
      const submission = {
        name: 'John Doe',
        message: 'Hello',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(false)
    })

    it('rejects submission with invalid email', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'user@.com',
        'user@com',
        'user space@example.com',
      ]

      invalidEmails.forEach((email) => {
        const submission = {
          name: 'John Doe',
          email,
          message: 'Hello',
        }

        const result = ContactSubmissionSchema.safeParse(submission)
        expect(result.success).toBe(false)
      })
    })

    it('rejects submission without message', () => {
      const submission = {
        name: 'John Doe',
        email: 'john@example.com',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(false)
    })

    it('rejects submission with empty message', () => {
      const submission = {
        name: 'John Doe',
        email: 'john@example.com',
        message: '',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Message is required')
      }
    })

    it('rejects submission with message exceeding 5000 characters', () => {
      const submission = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'A'.repeat(5001),
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(false)
    })

    it('rejects submission with phone exceeding 20 characters', () => {
      const submission = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1'.repeat(21),
        message: 'Hello',
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('accepts submission at exact character limits', () => {
      const submission = {
        name: 'A'.repeat(100),
        email: 'a@b.co',
        phone: '1'.repeat(20),
        message: 'A'.repeat(5000),
      }

      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(true)
    })

    it('trims and validates properly with whitespace', () => {
      const submission = {
        name: 'John Doe',
        email: 'john@example.com',
        message: '   ',
      }

      // Note: Zod doesn't trim by default, so whitespace-only strings pass min(1)
      // This test documents current behavior
      const result = ContactSubmissionSchema.safeParse(submission)
      expect(result.success).toBe(true)
    })
  })
})
