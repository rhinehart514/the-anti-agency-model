import * as cheerio from 'cheerio';
import type { CheckResult, Issue, Opportunity } from '../types';
import { generateIssueId } from '../types';

const CATEGORY = 'accessibility';

export async function checkAccessibility(
  url: string,
  html: string
): Promise<CheckResult> {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const opportunities: Opportunity[] = [];
  let score = 100;

  // Check 1: Language attribute
  const htmlLang = $('html').attr('lang');
  if (!htmlLang) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-lang'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Missing language attribute',
      description: 'HTML element is missing the lang attribute.',
      impact: 'Screen readers may mispronounce content without knowing the language.',
      howWeFix: 'We add the correct language attribute for proper screen reader pronunciation.',
    });
  }

  // Check 2: Images without alt text
  const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;
  const decorativeImages = $('img[alt=""]').length;
  const missingAlt = imagesWithoutAlt - decorativeImages;

  if (missingAlt > 0) {
    score -= Math.min(20, missingAlt * 5);
    issues.push({
      id: generateIssueId(CATEGORY, 'images-no-alt'),
      category: CATEGORY,
      severity: missingAlt > 3 ? 'critical' : 'warning',
      title: 'Images missing alt text',
      description: `${missingAlt} images have no alt attribute.`,
      impact: 'Blind users cannot understand what these images show.',
      howWeFix: 'We add descriptive alt text to all meaningful images.',
    });
  }

  // Check 3: Form labels
  const inputs = $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
  let unlabeledInputs = 0;

  inputs.each((_, input) => {
    const id = $(input).attr('id');
    const hasLabel = id && $(`label[for="${id}"]`).length > 0;
    const hasAriaLabel = $(input).attr('aria-label') || $(input).attr('aria-labelledby');
    const hasPlaceholder = $(input).attr('placeholder');

    if (!hasLabel && !hasAriaLabel && !hasPlaceholder) {
      unlabeledInputs++;
    }
  });

  if (unlabeledInputs > 0) {
    score -= Math.min(15, unlabeledInputs * 5);
    issues.push({
      id: generateIssueId(CATEGORY, 'unlabeled-inputs'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Form inputs without labels',
      description: `${unlabeledInputs} form inputs have no associated label.`,
      impact: 'Screen reader users won\'t know what information to enter.',
      howWeFix: 'We add proper labels to all form fields for accessibility.',
    });
  }

  // Check 4: Links without descriptive text
  const emptyLinks = $('a:not([aria-label])').filter((_, el) => {
    const text = $(el).text().trim();
    const hasImage = $(el).find('img[alt]').length > 0;
    return !text && !hasImage;
  }).length;

  const genericLinks = $('a').filter((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    return ['click here', 'read more', 'learn more', 'here', 'link'].includes(text);
  }).length;

  if (emptyLinks > 0) {
    score -= Math.min(15, emptyLinks * 5);
    issues.push({
      id: generateIssueId(CATEGORY, 'empty-links'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Empty links',
      description: `${emptyLinks} links have no accessible text.`,
      impact: 'Screen reader users cannot understand where these links go.',
      howWeFix: 'We ensure all links have descriptive text or aria-labels.',
    });
  }

  if (genericLinks > 3) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'generic-links'),
      category: CATEGORY,
      severity: 'info',
      title: 'Generic link text',
      description: `${genericLinks} links use generic text like "click here".`,
      impact: 'Users scanning for links don\'t know where they lead.',
      howWeFix: 'We use descriptive link text that explains the destination.',
    });
  }

  // Check 5: Heading hierarchy
  const headings = $('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  let skippedLevels = false;

  headings.each((_, el) => {
    // Get tag name from element - works with cheerio's element types
    const tagName = (el as unknown as { tagName?: string; name?: string }).tagName ||
                    (el as unknown as { tagName?: string; name?: string }).name;
    if (!tagName) return;
    const level = parseInt(tagName.substring(1), 10);
    if (level > lastLevel + 1 && lastLevel !== 0) {
      skippedLevels = true;
      return false; // Break
    }
    lastLevel = level;
  });

  if (skippedLevels) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'heading-skip'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Skipped heading levels',
      description: 'Heading hierarchy skips levels (e.g., H1 to H3).',
      impact: 'Screen reader users rely on heading structure to navigate.',
      howWeFix: 'We maintain proper heading hierarchy for easy navigation.',
    });
  }

  // Check 6: Color contrast (basic check for inline styles)
  const lightText = $('[style*="color:"][style*="#fff"], [style*="color:"][style*="white"]').length;
  const darkBgWithLightText = $('[style*="background"][style*="#000"], [style*="background"][style*="black"]').length;

  if (lightText > 0 && darkBgWithLightText === 0) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'contrast-concern'),
      category: CATEGORY,
      severity: 'info',
      title: 'Potential contrast issues',
      description: 'Light-colored text found that may have contrast issues.',
      impact: 'Low contrast text is hard to read, especially for vision-impaired users.',
      howWeFix: 'We ensure all text meets WCAG AA contrast requirements.',
    });
  }

  // Check 7: Skip navigation link
  const hasSkipLink = $('a[href="#main"], a[href="#content"], a.skip-link, a.skip-to-content').length > 0;
  if (!hasSkipLink) {
    score -= 5;
    opportunities.push({
      id: 'a11y-skip-link',
      category: CATEGORY,
      title: 'Add skip navigation link',
      description: 'No skip-to-content link found.',
      potentialGain: 'Keyboard users can jump straight to content without tabbing through nav.',
      implementation: 'Add a hidden skip link that becomes visible on focus.',
      priority: 'medium',
    });
  }

  // Check 8: Button accessibility
  const buttonsWithoutText = $('button').filter((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr('aria-label');
    const title = $(el).attr('title');
    return !text && !ariaLabel && !title;
  }).length;

  if (buttonsWithoutText > 0) {
    score -= Math.min(10, buttonsWithoutText * 3);
    issues.push({
      id: generateIssueId(CATEGORY, 'empty-buttons'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Buttons without accessible names',
      description: `${buttonsWithoutText} buttons have no accessible text.`,
      impact: 'Screen reader users cannot understand what these buttons do.',
      howWeFix: 'We add text or aria-labels to all buttons.',
    });
  }

  // Check 9: ARIA landmarks
  const hasMain = $('main, [role="main"]').length > 0;
  const hasNav = $('nav, [role="navigation"]').length > 0;

  if (!hasMain) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-main-landmark'),
      category: CATEGORY,
      severity: 'info',
      title: 'No main landmark',
      description: 'No <main> element or role="main" found.',
      impact: 'Screen reader users can\'t easily jump to main content.',
      howWeFix: 'We use semantic HTML landmarks for easy navigation.',
    });
  }

  // Check 10: Focus indicators (check for outline:none in styles)
  if (html.includes('outline: none') || html.includes('outline:none') || html.includes('outline: 0')) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'focus-removed'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Focus indicators may be removed',
      description: 'CSS that removes outlines was detected.',
      impact: 'Keyboard users can\'t see which element is focused.',
      howWeFix: 'We add custom focus indicators that are both visible and on-brand.',
    });
  }

  // Opportunities
  opportunities.push({
    id: 'a11y-audit',
    category: CATEGORY,
    title: 'Full accessibility audit',
    description: 'Consider a comprehensive WCAG 2.1 audit.',
    potentialGain: 'Expand your customer base to include users with disabilities.',
    implementation: 'Run automated tools + manual testing for full compliance.',
    priority: 'medium',
  });

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    weight: 10, // Accessibility is 10% of overall score
    issues,
    opportunities,
    metadata: {
      hasLang: !!htmlLang,
      imagesWithoutAlt: missingAlt,
      unlabeledInputs,
      emptyLinks,
      hasSkipLink,
      hasMainLandmark: hasMain,
      hasNavLandmark: hasNav,
    },
  };
}
