import { sendEmail, EMAIL_FROM } from './client';
import {
  orderConfirmationEmail,
  formSubmissionEmail,
  welcomeEmail,
  passwordResetEmail,
  workflowEmail,
  shippingNotificationEmail,
  invitationEmail,
  paymentFailedEmail,
  OrderConfirmationData,
  FormSubmissionData,
  WelcomeEmailData,
  PasswordResetData,
  WorkflowEmailData,
  ShippingNotificationData,
  InvitationEmailData,
  PaymentFailedData,
} from './templates';

// Send order confirmation
export async function sendOrderConfirmation(
  to: string,
  data: OrderConfirmationData
) {
  const html = orderConfirmationEmail(data);
  return sendEmail({
    to,
    subject: `Order Confirmed - #${data.orderNumber}`,
    html,
    tags: [
      { name: 'type', value: 'order_confirmation' },
      { name: 'order_number', value: data.orderNumber },
    ],
  });
}

// Send form submission notification
export async function sendFormNotification(
  to: string | string[],
  data: FormSubmissionData
) {
  const html = formSubmissionEmail(data);
  return sendEmail({
    to,
    subject: `New submission: ${data.formName}`,
    html,
    tags: [
      { name: 'type', value: 'form_submission' },
      { name: 'form_name', value: data.formName },
    ],
  });
}

// Send welcome email
export async function sendWelcomeEmail(to: string, data: WelcomeEmailData) {
  const html = welcomeEmail(data);
  return sendEmail({
    to,
    subject: `Welcome to ${data.siteName || 'Our Platform'}!`,
    html,
    tags: [{ name: 'type', value: 'welcome' }],
  });
}

// Send password reset email
export async function sendPasswordResetEmail(
  to: string,
  data: PasswordResetData
) {
  const html = passwordResetEmail(data);
  return sendEmail({
    to,
    subject: 'Reset Your Password',
    html,
    tags: [{ name: 'type', value: 'password_reset' }],
  });
}

// Send workflow email (custom content)
export async function sendWorkflowEmail(to: string, data: WorkflowEmailData) {
  const html = workflowEmail(data);
  return sendEmail({
    to,
    subject: data.subject,
    html,
    tags: [{ name: 'type', value: 'workflow' }],
  });
}

// Send shipping notification
export async function sendShippingNotification(
  to: string,
  data: ShippingNotificationData
) {
  const html = shippingNotificationEmail(data);
  return sendEmail({
    to,
    subject: `Your order #${data.orderNumber} has shipped!`,
    html,
    tags: [
      { name: 'type', value: 'shipping_notification' },
      { name: 'order_number', value: data.orderNumber },
    ],
  });
}

// Send invitation email
export async function sendInvitationEmail(
  to: string,
  data: InvitationEmailData
) {
  const html = invitationEmail(data);
  return sendEmail({
    to,
    subject: `You're invited to join ${data.siteName || 'our platform'}`,
    html,
    tags: [{ name: 'type', value: 'invitation' }],
  });
}

// Send payment failed notification
export async function sendPaymentFailedEmail(
  to: string,
  data: PaymentFailedData
) {
  const html = paymentFailedEmail(data);
  return sendEmail({
    to,
    subject: `Payment failed${data.orderNumber ? ` for order #${data.orderNumber}` : ''}`,
    html,
    tags: [
      { name: 'type', value: 'payment_failed' },
      ...(data.orderNumber ? [{ name: 'order_number', value: data.orderNumber }] : []),
    ],
  });
}

// Generic send with template
export async function sendTemplatedEmail(
  to: string | string[],
  template: 'order_confirmation' | 'form_submission' | 'welcome' | 'password_reset' | 'workflow' | 'shipping',
  data: any
) {
  let html: string;
  let subject: string;

  switch (template) {
    case 'order_confirmation':
      html = orderConfirmationEmail(data);
      subject = `Order Confirmed - #${data.orderNumber}`;
      break;
    case 'form_submission':
      html = formSubmissionEmail(data);
      subject = `New submission: ${data.formName}`;
      break;
    case 'welcome':
      html = welcomeEmail(data);
      subject = `Welcome to ${data.siteName || 'Our Platform'}!`;
      break;
    case 'password_reset':
      html = passwordResetEmail(data);
      subject = 'Reset Your Password';
      break;
    case 'workflow':
      html = workflowEmail(data);
      subject = data.subject;
      break;
    case 'shipping':
      html = shippingNotificationEmail(data);
      subject = `Your order #${data.orderNumber} has shipped!`;
      break;
    default:
      throw new Error(`Unknown email template: ${template}`);
  }

  return sendEmail({
    to,
    subject,
    html,
    tags: [{ name: 'type', value: template }],
  });
}

// Utility: Replace template variables in string
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, any>
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const keys = path.split('.');
    let value: any = variables;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return match; // Keep original if not found
      }
    }

    return String(value ?? '');
  });
}
