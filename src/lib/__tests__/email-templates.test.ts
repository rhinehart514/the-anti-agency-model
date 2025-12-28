import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  emailWrapper,
  orderConfirmationEmail,
  formSubmissionEmail,
  welcomeEmail,
  passwordResetEmail,
  workflowEmail,
  shippingNotificationEmail,
  type OrderConfirmationData,
  type FormSubmissionData,
  type WelcomeEmailData,
  type PasswordResetData,
  type WorkflowEmailData,
  type ShippingNotificationData,
} from '../email/templates'

describe('emailWrapper', () => {
  it('generates valid HTML structure', () => {
    const html = emailWrapper('<p>Test content</p>')

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html>')
    expect(html).toContain('</html>')
    expect(html).toContain('<p>Test content</p>')
  })

  it('uses default site name when not provided', () => {
    const html = emailWrapper('<p>Test</p>')
    expect(html).toContain('Our Platform')
  })

  it('uses custom site name when provided', () => {
    const html = emailWrapper('<p>Test</p>', { siteName: 'My Store' })
    expect(html).toContain('My Store')
  })

  it('uses default primary color when not provided', () => {
    const html = emailWrapper('<p>Test</p>')
    expect(html).toContain('#0F172A')
  })

  it('uses custom primary color when provided', () => {
    const html = emailWrapper('<p>Test</p>', { primaryColor: '#FF5500' })
    expect(html).toContain('#FF5500')
  })

  it('includes footer with copyright', () => {
    const html = emailWrapper('<p>Test</p>')
    const currentYear = new Date().getFullYear()
    expect(html).toContain(`${currentYear}`)
    expect(html).toContain('All rights reserved')
  })
})

describe('orderConfirmationEmail', () => {
  const baseOrderData: OrderConfirmationData = {
    orderNumber: 'ORD-001',
    customerName: 'John Doe',
    items: [
      { name: 'Product A', quantity: 2, price: 25 },
      { name: 'Product B', quantity: 1, price: 50 },
    ],
    subtotal: 100,
    shipping: 10,
    discount: 5,
    tax: 8,
    total: 113,
    shippingAddress: {
      name: 'John Doe',
      address1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
    },
  }

  it('includes order number', () => {
    const html = orderConfirmationEmail(baseOrderData)
    expect(html).toContain('ORD-001')
  })

  it('includes customer name', () => {
    const html = orderConfirmationEmail(baseOrderData)
    expect(html).toContain('John Doe')
  })

  it('includes order items with prices', () => {
    const html = orderConfirmationEmail(baseOrderData)
    expect(html).toContain('Product A x 2')
    expect(html).toContain('$50.00')
    expect(html).toContain('Product B x 1')
  })

  it('includes shipping when greater than zero', () => {
    const html = orderConfirmationEmail(baseOrderData)
    expect(html).toContain('Shipping')
    expect(html).toContain('$10.00')
  })

  it('excludes shipping when zero', () => {
    const html = orderConfirmationEmail({ ...baseOrderData, shipping: 0 })
    const shippingMatches = (html.match(/Shipping/g) || []).length
    // Should only appear in "Shipping Address" heading, not as a line item
    expect(shippingMatches).toBeLessThanOrEqual(1)
  })

  it('includes discount when greater than zero', () => {
    const html = orderConfirmationEmail(baseOrderData)
    expect(html).toContain('Discount')
    expect(html).toContain('-$5.00')
  })

  it('excludes discount when zero', () => {
    const html = orderConfirmationEmail({ ...baseOrderData, discount: 0 })
    expect(html).not.toContain('-$0.00')
  })

  it('includes tax when greater than zero', () => {
    const html = orderConfirmationEmail(baseOrderData)
    expect(html).toContain('Tax')
    expect(html).toContain('$8.00')
  })

  it('excludes tax when zero', () => {
    const html = orderConfirmationEmail({ ...baseOrderData, tax: 0 })
    expect(html).not.toMatch(/Tax.*\$0\.00/)
  })

  it('includes shipping address', () => {
    const html = orderConfirmationEmail(baseOrderData)
    expect(html).toContain('123 Main St')
    expect(html).toContain('New York')
    expect(html).toContain('NY')
    expect(html).toContain('10001')
  })

  it('includes address2 when provided', () => {
    const dataWithAddress2 = {
      ...baseOrderData,
      shippingAddress: { ...baseOrderData.shippingAddress, address2: 'Apt 4B' },
    }
    const html = orderConfirmationEmail(dataWithAddress2)
    expect(html).toContain('Apt 4B')
  })

  it('includes order URL button when provided', () => {
    const html = orderConfirmationEmail({
      ...baseOrderData,
      orderUrl: 'https://example.com/order/123',
    })
    expect(html).toContain('View Order')
    expect(html).toContain('https://example.com/order/123')
  })

  it('excludes order URL button when not provided', () => {
    const html = orderConfirmationEmail(baseOrderData)
    expect(html).not.toContain('View Order')
  })
})

describe('formSubmissionEmail', () => {
  const baseFormData: FormSubmissionData = {
    formName: 'Contact Form',
    submissionData: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'Hello there!',
      _internal: 'should be filtered',
    },
    submittedAt: '2024-01-15T10:30:00Z',
  }

  it('includes form name', () => {
    const html = formSubmissionEmail(baseFormData)
    expect(html).toContain('Contact Form')
  })

  it('includes submission fields', () => {
    const html = formSubmissionEmail(baseFormData)
    expect(html).toContain('name')
    expect(html).toContain('Jane Doe')
    expect(html).toContain('email')
    expect(html).toContain('jane@example.com')
    expect(html).toContain('message')
    expect(html).toContain('Hello there!')
  })

  it('filters out fields starting with underscore', () => {
    const html = formSubmissionEmail(baseFormData)
    expect(html).not.toContain('_internal')
    expect(html).not.toContain('should be filtered')
  })

  it('uses custom site name', () => {
    const html = formSubmissionEmail({ ...baseFormData, siteName: 'My Site' })
    expect(html).toContain('My Site')
  })
})

describe('welcomeEmail', () => {
  const baseWelcomeData: WelcomeEmailData = {
    userName: 'New User',
  }

  it('includes user name', () => {
    const html = welcomeEmail(baseWelcomeData)
    expect(html).toContain('New User')
  })

  it('includes welcome message', () => {
    const html = welcomeEmail(baseWelcomeData)
    expect(html).toContain('Welcome')
  })

  it('includes verification button when URL provided', () => {
    const html = welcomeEmail({
      ...baseWelcomeData,
      verificationUrl: 'https://example.com/verify',
    })
    expect(html).toContain('Verify Email')
    expect(html).toContain('https://example.com/verify')
  })

  it('excludes verification button when URL not provided', () => {
    const html = welcomeEmail(baseWelcomeData)
    expect(html).not.toContain('Verify Email')
  })

  it('includes login button when URL provided', () => {
    const html = welcomeEmail({
      ...baseWelcomeData,
      loginUrl: 'https://example.com/login',
    })
    expect(html).toContain('Log In')
    expect(html).toContain('https://example.com/login')
  })

  it('excludes login button when URL not provided', () => {
    const html = welcomeEmail(baseWelcomeData)
    expect(html).not.toContain('Log In')
  })

  it('uses custom site name', () => {
    const html = welcomeEmail({ ...baseWelcomeData, siteName: 'Super App' })
    expect(html).toContain('Super App')
  })
})

describe('passwordResetEmail', () => {
  const baseResetData: PasswordResetData = {
    userName: 'User',
    resetUrl: 'https://example.com/reset/token123',
  }

  it('includes user name', () => {
    const html = passwordResetEmail(baseResetData)
    expect(html).toContain('User')
  })

  it('includes reset button with URL', () => {
    const html = passwordResetEmail(baseResetData)
    expect(html).toContain('Reset Password')
    expect(html).toContain('https://example.com/reset/token123')
  })

  it('uses default expiration time', () => {
    const html = passwordResetEmail(baseResetData)
    expect(html).toContain('1 hour')
  })

  it('uses custom expiration time when provided', () => {
    const html = passwordResetEmail({ ...baseResetData, expiresIn: '30 minutes' })
    expect(html).toContain('30 minutes')
  })

  it('includes security tip', () => {
    const html = passwordResetEmail(baseResetData)
    expect(html).toContain('Security Tip')
  })
})

describe('workflowEmail', () => {
  const baseWorkflowData: WorkflowEmailData = {
    subject: 'Action Required',
    body: '<p>Please review your submission.</p>',
  }

  it('includes subject as heading', () => {
    const html = workflowEmail(baseWorkflowData)
    expect(html).toContain('Action Required')
  })

  it('includes body content', () => {
    const html = workflowEmail(baseWorkflowData)
    expect(html).toContain('Please review your submission')
  })

  it('includes CTA button when both text and URL provided', () => {
    const html = workflowEmail({
      ...baseWorkflowData,
      ctaText: 'Take Action',
      ctaUrl: 'https://example.com/action',
    })
    expect(html).toContain('Take Action')
    expect(html).toContain('https://example.com/action')
  })

  it('excludes CTA button when text missing', () => {
    const html = workflowEmail({
      ...baseWorkflowData,
      ctaUrl: 'https://example.com/action',
    })
    expect(html).not.toContain('class="button"')
  })

  it('excludes CTA button when URL missing', () => {
    const html = workflowEmail({
      ...baseWorkflowData,
      ctaText: 'Take Action',
    })
    expect(html).not.toContain('class="button"')
  })
})

describe('shippingNotificationEmail', () => {
  const baseShippingData: ShippingNotificationData = {
    orderNumber: 'ORD-123',
    customerName: 'Customer',
  }

  it('includes order number', () => {
    const html = shippingNotificationEmail(baseShippingData)
    expect(html).toContain('#ORD-123')
  })

  it('includes customer name', () => {
    const html = shippingNotificationEmail(baseShippingData)
    expect(html).toContain('Customer')
  })

  it('includes shipped message', () => {
    const html = shippingNotificationEmail(baseShippingData)
    expect(html).toContain('Has Shipped')
  })

  it('includes tracking info when provided', () => {
    const html = shippingNotificationEmail({
      ...baseShippingData,
      trackingNumber: 'TRACK123',
      carrier: 'FedEx',
      estimatedDelivery: 'Dec 25, 2024',
    })
    expect(html).toContain('TRACK123')
    expect(html).toContain('FedEx')
    expect(html).toContain('Dec 25, 2024')
  })

  it('excludes tracking info when not provided', () => {
    const html = shippingNotificationEmail(baseShippingData)
    expect(html).not.toContain('Tracking Number')
  })

  it('includes track button when URL provided', () => {
    const html = shippingNotificationEmail({
      ...baseShippingData,
      trackingUrl: 'https://tracking.example.com/123',
    })
    expect(html).toContain('Track Your Order')
    expect(html).toContain('https://tracking.example.com/123')
  })

  it('excludes track button when URL not provided', () => {
    const html = shippingNotificationEmail(baseShippingData)
    expect(html).not.toContain('Track Your Order')
  })

  it('includes carrier without estimated delivery', () => {
    const html = shippingNotificationEmail({
      ...baseShippingData,
      trackingNumber: 'TRACK123',
      carrier: 'UPS',
    })
    expect(html).toContain('UPS')
    expect(html).not.toContain('Estimated Delivery')
  })

  it('includes estimated delivery without carrier', () => {
    const html = shippingNotificationEmail({
      ...baseShippingData,
      trackingNumber: 'TRACK123',
      estimatedDelivery: 'Tomorrow',
    })
    expect(html).toContain('Tomorrow')
  })
})
