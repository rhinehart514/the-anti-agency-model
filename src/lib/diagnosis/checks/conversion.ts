import * as cheerio from 'cheerio';
import type { CheckResult, Issue, Opportunity } from '../types';
import { generateIssueId } from '../types';

const CATEGORY = 'conversion';

export async function checkConversion(
  url: string,
  html: string
): Promise<CheckResult> {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const opportunities: Opportunity[] = [];
  let score = 100;

  // Check 1: Contact information visibility
  const hasPhone = $('a[href^="tel:"]').length > 0 || /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(html);
  const hasEmail = $('a[href^="mailto:"]').length > 0;

  if (!hasPhone) {
    score -= 15;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-phone'),
      category: CATEGORY,
      severity: 'critical',
      title: 'No visible phone number',
      description: 'No clickable phone number found on the page.',
      impact: 'Customers who want to call can\'t easily find your number, losing potential leads.',
      howWeFix: 'We display a clickable phone number prominently in the header and footer.',
    });
  }

  if (!hasEmail) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-email'),
      category: CATEGORY,
      severity: 'warning',
      title: 'No visible email',
      description: 'No clickable email address found.',
      impact: 'Some customers prefer email; they\'ll leave if they can\'t find it.',
      howWeFix: 'We add a visible email link and contact form for easy reach.',
    });
  }

  // Check 2: Call-to-action buttons
  const ctaKeywords = ['contact', 'call', 'book', 'schedule', 'get started', 'free', 'quote', 'consultation', 'buy', 'order', 'sign up', 'learn more'];
  const buttons = $('button, a.btn, a.button, [class*="btn"], [class*="button"], a[href*="contact"]');

  let ctaCount = 0;
  buttons.each((_, el) => {
    const text = $(el).text().toLowerCase();
    if (ctaKeywords.some(keyword => text.includes(keyword))) {
      ctaCount++;
    }
  });

  if (ctaCount === 0) {
    score -= 20;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-cta'),
      category: CATEGORY,
      severity: 'critical',
      title: 'No clear call-to-action',
      description: 'No buttons with action-oriented text found.',
      impact: 'Visitors don\'t know what to do next, so they leave without taking action.',
      howWeFix: 'We add clear, compelling CTAs that guide visitors to contact you or buy.',
    });
  } else if (ctaCount < 2) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'weak-cta'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Limited calls-to-action',
      description: `Only ${ctaCount} clear CTA found.`,
      impact: 'You may be missing conversion opportunities throughout the page.',
      howWeFix: 'We add strategic CTAs at key points to maximize conversions.',
    });
  }

  // Check 3: Contact forms
  const forms = $('form');
  const hasContactForm = forms.filter((_, form) => {
    const inputs = $(form).find('input, textarea');
    let hasNameOrEmail = false;
    let hasMessage = false;

    inputs.each((_, input) => {
      const name = ($(input).attr('name') || '').toLowerCase();
      const type = ($(input).attr('type') || '').toLowerCase();
      const placeholder = ($(input).attr('placeholder') || '').toLowerCase();

      if (name.includes('name') || name.includes('email') || type === 'email') {
        hasNameOrEmail = true;
      }
      if (name.includes('message') || placeholder.includes('message') || $(input).is('textarea')) {
        hasMessage = true;
      }
    });

    return hasNameOrEmail;
  }).length > 0;

  if (!hasContactForm && forms.length === 0) {
    score -= 15;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-contact-form'),
      category: CATEGORY,
      severity: 'critical',
      title: 'No contact form',
      description: 'No contact form found on the page.',
      impact: 'You\'re missing leads from visitors who prefer forms over calls or emails.',
      howWeFix: 'We add a simple, effective contact form that captures leads automatically.',
    });
  }

  // Check 4: Trust signals
  const trustKeywords = ['years', 'experience', 'certified', 'licensed', 'insured', 'guarantee', 'warranty', 'customers', 'clients', 'reviews', 'testimonial', 'trusted', 'award'];
  const bodyText = $('body').text().toLowerCase();
  const hasTrustSignals = trustKeywords.some(keyword => bodyText.includes(keyword));

  if (!hasTrustSignals) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-trust'),
      category: CATEGORY,
      severity: 'warning',
      title: 'No visible trust signals',
      description: 'No mentions of experience, certifications, or guarantees found.',
      impact: 'Visitors may not trust you enough to take action.',
      howWeFix: 'We highlight your credentials, experience, and guarantees prominently.',
    });
  }

  // Check 5: Testimonials
  const hasTestimonials =
    $('[class*="testimonial"], [class*="review"], blockquote').length > 0 ||
    bodyText.includes('testimonial') ||
    bodyText.includes('"') && (bodyText.includes('great') || bodyText.includes('recommend') || bodyText.includes('excellent'));

  if (!hasTestimonials) {
    score -= 10;
    opportunities.push({
      id: 'conv-testimonials',
      category: CATEGORY,
      title: 'Add customer testimonials',
      description: 'No testimonials or reviews found on the page.',
      potentialGain: 'Testimonials can increase conversions by 34%.',
      implementation: 'Add 3-5 customer testimonials with names and photos if possible.',
      priority: 'high',
    });
  }

  // Check 6: Social proof (specific numbers)
  const hasNumbers = /\d+\+?\s*(years|customers|clients|projects|reviews)/i.test(bodyText);
  if (!hasNumbers) {
    score -= 5;
    opportunities.push({
      id: 'conv-social-proof',
      category: CATEGORY,
      title: 'Add specific numbers',
      description: 'No specific numbers for social proof found.',
      potentialGain: 'Specific numbers like "500+ happy customers" increase trust.',
      implementation: 'Add statistics about your experience, customers, or projects.',
      priority: 'medium',
    });
  }

  // Check 7: Urgency/scarcity (optional)
  const hasUrgency = /(limited|hurry|today|now|special offer|discount|sale)/i.test(bodyText);
  if (!hasUrgency) {
    opportunities.push({
      id: 'conv-urgency',
      category: CATEGORY,
      title: 'Consider adding urgency',
      description: 'No urgency elements detected.',
      potentialGain: 'Urgency can increase conversions, but use authentically.',
      implementation: 'Add genuine limited-time offers or seasonal promotions.',
      priority: 'low',
    });
  }

  // Check 8: Above-the-fold CTA
  // This is a heuristic - check if there's a button in the first 500 chars of body text
  const firstSection = $('body').children().first().text().substring(0, 1000).toLowerCase();
  const hasAboveFoldCta = ctaKeywords.some(keyword => firstSection.includes(keyword));

  if (!hasAboveFoldCta && ctaCount > 0) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'cta-below-fold'),
      category: CATEGORY,
      severity: 'info',
      title: 'CTA may be below the fold',
      description: 'Main call-to-action appears to be lower on the page.',
      impact: 'Some visitors may leave before seeing your CTA.',
      howWeFix: 'We place a clear CTA visible immediately when the page loads.',
    });
  }

  // Check 9: Pricing visibility
  const hasPricing = /\$\d|price|pricing|quote|estimate|starting at/i.test(bodyText);
  if (!hasPricing) {
    opportunities.push({
      id: 'conv-pricing',
      category: CATEGORY,
      title: 'Consider showing pricing',
      description: 'No pricing information found.',
      potentialGain: 'Transparent pricing builds trust and qualifies leads.',
      implementation: 'Add pricing or "starting at" rates to set expectations.',
      priority: 'medium',
    });
  }

  // Check 10: Service area (for local businesses)
  const hasServiceArea = /(serving|service area|we serve|locations?:|available in)/i.test(bodyText);
  if (!hasServiceArea) {
    opportunities.push({
      id: 'conv-service-area',
      category: CATEGORY,
      title: 'Clarify service area',
      description: 'No clear service area mentioned.',
      potentialGain: 'Local customers need to know you serve their area.',
      implementation: 'List the cities or regions you serve prominently.',
      priority: 'medium',
    });
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    weight: 20, // Conversion is 20% of overall score
    issues,
    opportunities,
    metadata: {
      hasPhone,
      hasEmail,
      ctaCount,
      hasContactForm,
      hasTrustSignals,
      hasTestimonials,
    },
  };
}
