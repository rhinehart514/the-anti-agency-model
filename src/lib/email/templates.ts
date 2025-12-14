import type { ContactNotificationData } from './types'

export function getContactNotificationEmail(data: ContactNotificationData): {
  subject: string
  html: string
  text: string
} {
  const { siteName, submitterName, submitterEmail, submitterPhone, message, submittedAt } = data

  const formattedDate = submittedAt.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const subject = `New contact form submission from ${submitterName} - ${siteName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #243b53 0%, #102a43 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">New Contact Form Submission</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">${siteName}</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
    <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #243b53; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">Contact Details</h2>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #666; width: 120px; vertical-align: top;">Name:</td>
          <td style="padding: 10px 0; font-weight: 600;">${escapeHtml(submitterName)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; vertical-align: top;">Email:</td>
          <td style="padding: 10px 0;">
            <a href="mailto:${escapeHtml(submitterEmail)}" style="color: #3182ce; text-decoration: none;">${escapeHtml(submitterEmail)}</a>
          </td>
        </tr>
        ${submitterPhone ? `
        <tr>
          <td style="padding: 10px 0; color: #666; vertical-align: top;">Phone:</td>
          <td style="padding: 10px 0;">
            <a href="tel:${escapeHtml(submitterPhone)}" style="color: #3182ce; text-decoration: none;">${escapeHtml(submitterPhone)}</a>
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 10px 0; color: #666; vertical-align: top;">Submitted:</td>
          <td style="padding: 10px 0;">${formattedDate}</td>
        </tr>
      </table>

      <h3 style="color: #243b53; font-size: 16px; margin-top: 25px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">Message</h3>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; white-space: pre-wrap; font-size: 14px; line-height: 1.8;">
${escapeHtml(message)}
      </div>
    </div>

    <div style="text-align: center; margin-top: 25px;">
      <a href="mailto:${escapeHtml(submitterEmail)}?subject=Re: Your inquiry to ${escapeHtml(siteName)}"
         style="display: inline-block; background: #243b53; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        Reply to ${escapeHtml(submitterName)}
      </a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>This email was sent from your website's contact form.</p>
    <p>Powered by The Anti-Agency</p>
  </div>
</body>
</html>
`

  const text = `
New Contact Form Submission - ${siteName}
==========================================

From: ${submitterName}
Email: ${submitterEmail}
${submitterPhone ? `Phone: ${submitterPhone}` : ''}
Submitted: ${formattedDate}

Message:
--------
${message}

---
Reply directly to this email or contact ${submitterEmail}
`

  return { subject, html, text }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
