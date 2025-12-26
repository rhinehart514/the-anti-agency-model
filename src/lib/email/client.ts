import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set - email functionality will be disabled');
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@example.com';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn('Email not sent - Resend is not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: params.from || EMAIL_FROM,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo,
      tags: params.tags,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

// Batch send emails
export async function sendBatchEmails(
  emails: SendEmailParams[]
): Promise<{ success: boolean; results: Array<{ success: boolean; id?: string; error?: string }> }> {
  if (!resend) {
    console.warn('Emails not sent - Resend is not configured');
    return { success: false, results: emails.map(() => ({ success: false, error: 'Email service not configured' })) };
  }

  const results = await Promise.all(emails.map(sendEmail));
  const allSucceeded = results.every((r) => r.success);

  return { success: allSucceeded, results };
}
