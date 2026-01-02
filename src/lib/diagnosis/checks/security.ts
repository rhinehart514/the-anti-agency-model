import * as cheerio from 'cheerio';
import type { CheckResult, Issue, Opportunity } from '../types';
import { generateIssueId } from '../types';

const CATEGORY = 'security';

export async function checkSecurity(
  url: string,
  html: string
): Promise<CheckResult> {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const opportunities: Opportunity[] = [];
  let score = 100;

  const parsedUrl = new URL(url);

  // Check 1: HTTPS
  if (parsedUrl.protocol !== 'https:') {
    score -= 30;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-https'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Site not using HTTPS',
      description: 'Site is served over HTTP instead of HTTPS.',
      impact: 'Browsers show "Not Secure" warning. Customer data is vulnerable. Google penalizes non-HTTPS sites.',
      howWeFix: 'We provide free SSL certificates and enforce HTTPS on all pages.',
    });
  }

  // Check 2: Mixed content
  const httpResources = $('script[src^="http:"], link[href^="http:"], img[src^="http:"], iframe[src^="http:"]').length;
  if (httpResources > 0 && parsedUrl.protocol === 'https:') {
    score -= 15;
    issues.push({
      id: generateIssueId(CATEGORY, 'mixed-content'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Mixed content detected',
      description: `${httpResources} resources loaded over insecure HTTP.`,
      impact: 'Browsers may block these resources, breaking functionality.',
      howWeFix: 'We ensure all resources are loaded over HTTPS.',
    });
  }

  // Check 3: External scripts from unknown sources
  const externalScripts = $('script[src]').filter((_, el) => {
    const src = $(el).attr('src') || '';
    try {
      const scriptUrl = new URL(src, url);
      return scriptUrl.host !== parsedUrl.host;
    } catch {
      return false;
    }
  });

  const untrustedScripts = externalScripts.filter((_, el) => {
    const src = $(el).attr('src') || '';
    const trustedDomains = [
      'googleapis.com',
      'gstatic.com',
      'googletagmanager.com',
      'google-analytics.com',
      'facebook.net',
      'facebook.com',
      'cloudflare.com',
      'cdnjs.cloudflare.com',
      'jsdelivr.net',
      'unpkg.com',
      'jquery.com',
      'stripe.com',
      'squarespace.com',
      'wix.com',
      'shopify.com',
    ];
    return !trustedDomains.some(domain => src.includes(domain));
  }).length;

  if (untrustedScripts > 2) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'untrusted-scripts'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Multiple external scripts',
      description: `${untrustedScripts} scripts from lesser-known sources.`,
      impact: 'Third-party scripts can be compromised, putting your customers at risk.',
      howWeFix: 'We carefully vet and minimize third-party scripts.',
    });
  }

  // Check 4: Form security
  const forms = $('form');
  let insecureForms = 0;

  forms.each((_, form) => {
    const action = $(form).attr('action') || '';
    if (action.startsWith('http:')) {
      insecureForms++;
    }
  });

  if (insecureForms > 0) {
    score -= 20;
    issues.push({
      id: generateIssueId(CATEGORY, 'insecure-forms'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Forms submit over HTTP',
      description: `${insecureForms} forms submit data insecurely.`,
      impact: 'Customer information (including sensitive data) can be intercepted.',
      howWeFix: 'We ensure all forms submit securely over HTTPS.',
    });
  }

  // Check 5: Target="_blank" without rel="noopener"
  const unsafeLinks = $('a[target="_blank"]:not([rel*="noopener"]):not([rel*="noreferrer"])').length;
  if (unsafeLinks > 3) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'unsafe-blank-links'),
      category: CATEGORY,
      severity: 'info',
      title: 'Unsafe external links',
      description: `${unsafeLinks} links open new tabs without security attributes.`,
      impact: 'Minor security risk: linked pages could potentially access your page.',
      howWeFix: 'We add rel="noopener noreferrer" to all external links.',
    });
  }

  // Check 6: Inline event handlers (potential XSS vectors)
  const inlineHandlers = $('[onclick], [onload], [onerror], [onmouseover]').length;
  if (inlineHandlers > 5) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'inline-handlers'),
      category: CATEGORY,
      severity: 'info',
      title: 'Inline JavaScript event handlers',
      description: `${inlineHandlers} elements use inline event handlers.`,
      impact: 'Inline handlers can make XSS attacks easier and CSP harder to implement.',
      howWeFix: 'We use external JavaScript and proper event listeners.',
    });
  }

  // Check 7: Password fields
  const passwordFields = $('input[type="password"]').length;
  if (passwordFields > 0 && parsedUrl.protocol !== 'https:') {
    score -= 30;
    issues.push({
      id: generateIssueId(CATEGORY, 'password-no-https'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Password field without HTTPS',
      description: 'Password input found on non-HTTPS page.',
      impact: 'Passwords can be intercepted by attackers.',
      howWeFix: 'We enforce HTTPS on all pages, especially those with login forms.',
    });
  }

  // Check 8: Credit card forms (look for payment-related inputs)
  const paymentInputs = $('input[name*="card"], input[name*="credit"], input[autocomplete*="cc-"]').length;
  if (paymentInputs > 0) {
    // Check if using known payment provider iframes
    const hasPaymentIframe = $('iframe[src*="stripe"], iframe[src*="paypal"], iframe[src*="square"]').length > 0;
    if (!hasPaymentIframe) {
      score -= 10;
      issues.push({
        id: generateIssueId(CATEGORY, 'direct-payment-fields'),
        category: CATEGORY,
        severity: 'warning',
        title: 'Direct payment form detected',
        description: 'Payment fields found outside of a secure payment iframe.',
        impact: 'PCI compliance may be affected. Use a payment provider like Stripe.',
        howWeFix: 'We integrate secure payment processing through Stripe.',
      });
    }
  }

  // Check 9: Content Security Policy hint
  // Note: We can't check actual headers from HTML, but we can check meta CSP
  const hasMetaCSP = $('meta[http-equiv="Content-Security-Policy"]').length > 0;
  if (!hasMetaCSP) {
    opportunities.push({
      id: 'sec-csp',
      category: CATEGORY,
      title: 'Add Content Security Policy',
      description: 'No Content Security Policy detected.',
      potentialGain: 'CSP helps prevent XSS and other injection attacks.',
      implementation: 'Configure appropriate CSP headers on the server.',
      priority: 'medium',
    });
  }

  // Check 10: Referrer Policy
  const hasReferrerPolicy = $('meta[name="referrer"]').length > 0;
  if (!hasReferrerPolicy) {
    opportunities.push({
      id: 'sec-referrer',
      category: CATEGORY,
      title: 'Set referrer policy',
      description: 'No referrer policy set.',
      potentialGain: 'Control what information is shared when users click external links.',
      implementation: 'Add a referrer-policy meta tag.',
      priority: 'low',
    });
  }

  // Opportunities
  if (!html.includes('integrity=')) {
    opportunities.push({
      id: 'sec-sri',
      category: CATEGORY,
      title: 'Add Subresource Integrity',
      description: 'External resources could use SRI for additional security.',
      potentialGain: 'Prevent loading of compromised third-party scripts.',
      implementation: 'Add integrity hashes to script and link tags.',
      priority: 'low',
    });
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    weight: 10, // Security is 10% of overall score
    issues,
    opportunities,
    metadata: {
      isHttps: parsedUrl.protocol === 'https:',
      mixedContent: httpResources,
      externalScripts: externalScripts.length,
      hasPasswordFields: passwordFields > 0,
      hasPaymentFields: paymentInputs > 0,
      hasCSP: hasMetaCSP,
    },
  };
}
