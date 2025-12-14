import type { EmailOptions, EmailResult, ContactNotificationData } from './types'
import { getContactNotificationEmail } from './templates'

const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || 'notifications@example.com'
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || 'The Anti-Agency'

/**
 * Send an email using the configured provider
 *
 * Currently supports:
 * - Resend (recommended) - set RESEND_API_KEY
 * - Console logging (development fallback)
 *
 * To add more providers (SendGrid, AWS SES, etc.), extend this function
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, from, replyTo } = options

  // Use Resend if API key is configured
  if (process.env.RESEND_API_KEY) {
    return sendWithResend({ to, subject, html, text, from, replyTo })
  }

  // Development fallback: log to console
  console.log('------- EMAIL NOTIFICATION (dev mode) -------')
  console.log(`To: ${to}`)
  console.log(`From: ${from || `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`}`)
  if (replyTo) console.log(`Reply-To: ${replyTo}`)
  console.log(`Subject: ${subject}`)
  console.log('Body (text):', text?.slice(0, 500) || 'No text version')
  console.log('----------------------------------------------')

  return {
    success: true,
    messageId: `dev-${Date.now()}`,
  }
}

/**
 * Send email using Resend API
 */
async function sendWithResend(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, from, replyTo } = options

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
        text,
        reply_to: replyTo,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      return {
        success: false,
        error: data.message || 'Failed to send email',
      }
    }

    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send contact form notification to site owner
 */
export async function sendContactNotification(
  ownerEmail: string,
  data: ContactNotificationData
): Promise<EmailResult> {
  const { subject, html, text } = getContactNotificationEmail(data)

  return sendEmail({
    to: ownerEmail,
    subject,
    html,
    text,
    replyTo: data.submitterEmail,
  })
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}
