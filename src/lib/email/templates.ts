// Email template helpers and definitions

export interface EmailTemplateData {
  siteName?: string;
  siteUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
}

// Base wrapper for all emails
export function emailWrapper(content: string, data: EmailTemplateData = {}): string {
  const { siteName = 'Our Platform', primaryColor = '#0F172A' } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .email-card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 32px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      max-height: 48px;
      margin-bottom: 16px;
    }
    h1 {
      color: ${primaryColor};
      font-size: 24px;
      margin: 0 0 16px;
    }
    h2 {
      color: ${primaryColor};
      font-size: 20px;
      margin: 24px 0 12px;
    }
    p {
      margin: 0 0 16px;
    }
    .button {
      display: inline-block;
      background: ${primaryColor};
      color: #ffffff !important;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 16px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 14px;
    }
    .info-box {
      background: #f8fafc;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    .order-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .order-item:last-child {
      border-bottom: none;
    }
    .total-row {
      font-weight: bold;
      font-size: 18px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}

// Order confirmation email
export interface OrderConfirmationData extends EmailTemplateData {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  orderUrl?: string;
}

export function orderConfirmationEmail(data: OrderConfirmationData): string {
  const {
    orderNumber,
    customerName,
    items,
    subtotal,
    shipping,
    discount,
    tax,
    total,
    shippingAddress,
    orderUrl,
    siteName = 'Our Store',
  } = data;

  const itemsHtml = items
    .map(
      (item) => `
    <div class="order-item">
      <span>${item.name} x ${item.quantity}</span>
      <span>$${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `
    )
    .join('');

  const content = `
    <div class="header">
      <h1>Order Confirmed!</h1>
    </div>

    <p>Hi ${customerName},</p>
    <p>Thank you for your order! We've received your order and will begin processing it shortly.</p>

    <div class="info-box">
      <strong>Order Number:</strong> ${orderNumber}
    </div>

    <h2>Order Summary</h2>
    <div>
      ${itemsHtml}
      <div class="order-item">
        <span>Subtotal</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
      ${shipping > 0 ? `
      <div class="order-item">
        <span>Shipping</span>
        <span>$${shipping.toFixed(2)}</span>
      </div>
      ` : ''}
      ${discount > 0 ? `
      <div class="order-item" style="color: #16a34a;">
        <span>Discount</span>
        <span>-$${discount.toFixed(2)}</span>
      </div>
      ` : ''}
      ${tax > 0 ? `
      <div class="order-item">
        <span>Tax</span>
        <span>$${tax.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="order-item total-row">
        <span>Total</span>
        <span>$${total.toFixed(2)}</span>
      </div>
    </div>

    <h2>Shipping Address</h2>
    <div class="info-box">
      ${shippingAddress.name}<br>
      ${shippingAddress.address1}<br>
      ${shippingAddress.address2 ? `${shippingAddress.address2}<br>` : ''}
      ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br>
      ${shippingAddress.country}
    </div>

    ${orderUrl ? `
    <p style="text-align: center;">
      <a href="${orderUrl}" class="button">View Order</a>
    </p>
    ` : ''}

    <p>If you have any questions about your order, please don't hesitate to contact us.</p>
  `;

  return emailWrapper(content, { siteName, primaryColor: data.primaryColor });
}

// Form submission notification
export interface FormSubmissionData extends EmailTemplateData {
  formName: string;
  submissionData: Record<string, any>;
  submittedAt: string;
}

export function formSubmissionEmail(data: FormSubmissionData): string {
  const { formName, submissionData, submittedAt, siteName = 'Your Site' } = data;

  const fieldsHtml = Object.entries(submissionData)
    .filter(([key]) => !key.startsWith('_'))
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; width: 30%;">${key}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${String(value)}</td>
      </tr>
    `
    )
    .join('');

  const content = `
    <div class="header">
      <h1>New Form Submission</h1>
    </div>

    <p>You received a new submission from <strong>${formName}</strong>.</p>

    <div class="info-box">
      <strong>Submitted at:</strong> ${new Date(submittedAt).toLocaleString()}
    </div>

    <h2>Submission Details</h2>
    <table style="width: 100%; border-collapse: collapse;">
      ${fieldsHtml}
    </table>
  `;

  return emailWrapper(content, { siteName, primaryColor: data.primaryColor });
}

// User welcome email
export interface WelcomeEmailData extends EmailTemplateData {
  userName: string;
  loginUrl?: string;
  verificationUrl?: string;
}

export function welcomeEmail(data: WelcomeEmailData): string {
  const { userName, loginUrl, verificationUrl, siteName = 'Our Platform' } = data;

  const content = `
    <div class="header">
      <h1>Welcome to ${siteName}!</h1>
    </div>

    <p>Hi ${userName},</p>
    <p>Thank you for joining ${siteName}! We're excited to have you on board.</p>

    ${verificationUrl ? `
    <p>Please verify your email address by clicking the button below:</p>
    <p style="text-align: center;">
      <a href="${verificationUrl}" class="button">Verify Email</a>
    </p>
    ` : ''}

    ${loginUrl ? `
    <p>You can access your account anytime:</p>
    <p style="text-align: center;">
      <a href="${loginUrl}" class="button">Log In</a>
    </p>
    ` : ''}

    <p>If you have any questions, feel free to reach out to our support team.</p>
    <p>Welcome aboard!</p>
  `;

  return emailWrapper(content, { siteName, primaryColor: data.primaryColor });
}

// Password reset email
export interface PasswordResetData extends EmailTemplateData {
  userName: string;
  resetUrl: string;
  expiresIn?: string;
}

export function passwordResetEmail(data: PasswordResetData): string {
  const { userName, resetUrl, expiresIn = '1 hour', siteName = 'Our Platform' } = data;

  const content = `
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>

    <p>Hi ${userName},</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>

    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>

    <p style="color: #64748b; font-size: 14px;">
      This link will expire in ${expiresIn}. If you didn't request a password reset, you can safely ignore this email.
    </p>

    <div class="info-box">
      <strong>Security Tip:</strong> Never share your password with anyone. Our team will never ask for your password.
    </div>
  `;

  return emailWrapper(content, { siteName, primaryColor: data.primaryColor });
}

// Generic workflow email (for custom workflow actions)
export interface WorkflowEmailData extends EmailTemplateData {
  subject: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function workflowEmail(data: WorkflowEmailData): string {
  const { body, ctaText, ctaUrl, siteName } = data;

  const content = `
    <div class="header">
      <h1>${data.subject}</h1>
    </div>

    <div>${body}</div>

    ${ctaText && ctaUrl ? `
    <p style="text-align: center;">
      <a href="${ctaUrl}" class="button">${ctaText}</a>
    </p>
    ` : ''}
  `;

  return emailWrapper(content, { siteName, primaryColor: data.primaryColor });
}

// Shipping notification email
export interface ShippingNotificationData extends EmailTemplateData {
  orderNumber: string;
  customerName: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: string;
}

export function shippingNotificationEmail(data: ShippingNotificationData): string {
  const {
    orderNumber,
    customerName,
    trackingNumber,
    trackingUrl,
    carrier,
    estimatedDelivery,
    siteName = 'Our Store',
  } = data;

  const content = `
    <div class="header">
      <h1>Your Order Has Shipped!</h1>
    </div>

    <p>Hi ${customerName},</p>
    <p>Great news! Your order <strong>#${orderNumber}</strong> is on its way.</p>

    ${trackingNumber ? `
    <div class="info-box">
      <strong>Tracking Number:</strong> ${trackingNumber}<br>
      ${carrier ? `<strong>Carrier:</strong> ${carrier}<br>` : ''}
      ${estimatedDelivery ? `<strong>Estimated Delivery:</strong> ${estimatedDelivery}` : ''}
    </div>
    ` : ''}

    ${trackingUrl ? `
    <p style="text-align: center;">
      <a href="${trackingUrl}" class="button">Track Your Order</a>
    </p>
    ` : ''}

    <p>We hope you enjoy your purchase!</p>
  `;

  return emailWrapper(content, { siteName, primaryColor: data.primaryColor });
}
