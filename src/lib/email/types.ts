export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<EmailResult>
}

export interface ContactNotificationData {
  siteName: string
  siteSlug: string
  submitterName: string
  submitterEmail: string
  submitterPhone?: string
  message: string
  submittedAt: Date
}
