import * as cheerio from 'cheerio';
import type { CheckResult, Issue, Opportunity } from '../types';
import { generateIssueId } from '../types';

const CATEGORY = 'mobile';

export async function checkMobile(
  url: string,
  html: string
): Promise<CheckResult> {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const opportunities: Opportunity[] = [];
  let score = 100;

  // Check 1: Viewport meta tag
  const viewportMeta = $('meta[name="viewport"]').attr('content');
  if (!viewportMeta) {
    score -= 30;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-viewport'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Missing viewport meta tag',
      description: 'No viewport meta tag found in the document.',
      impact: 'Page will not scale properly on mobile devices, appearing tiny or requiring horizontal scrolling.',
      howWeFix: 'We add proper viewport configuration for perfect mobile scaling.',
    });
  } else if (!viewportMeta.includes('width=device-width')) {
    score -= 15;
    issues.push({
      id: generateIssueId(CATEGORY, 'bad-viewport'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Improper viewport configuration',
      description: 'Viewport meta tag is missing width=device-width.',
      impact: 'Mobile layout may not adapt correctly to different screen sizes.',
      howWeFix: 'We configure the viewport correctly for all device sizes.',
    });
  }

  // Check 2: Touch targets (buttons, links)
  // We check for very small link text which often indicates tiny touch targets
  const smallLinks = $('a').filter((_, el) => {
    const text = $(el).text().trim();
    return text.length > 0 && text.length < 3;
  }).length;

  if (smallLinks > 5) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'small-touch-targets'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Small touch targets',
      description: `Found ${smallLinks} potentially small touch targets.`,
      impact: 'Users struggle to tap small buttons on mobile, causing frustration and missed conversions.',
      howWeFix: 'We ensure all buttons and links are at least 44x44 pixels for easy tapping.',
    });
  }

  // Check 3: Horizontal scrolling indicators
  // Check for fixed-width containers that might cause overflow
  const fixedWidthElements = $('[style*="width:"][style*="px"]').filter((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/width:\s*(\d+)px/);
    if (match) {
      const width = parseInt(match[1], 10);
      return width > 400;
    }
    return false;
  }).length;

  if (fixedWidthElements > 3) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'fixed-width'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Fixed-width elements detected',
      description: `Found ${fixedWidthElements} elements with fixed pixel widths.`,
      impact: 'Content may overflow on smaller screens, requiring horizontal scrolling.',
      howWeFix: 'We use responsive widths that adapt to any screen size.',
    });
  }

  // Check 4: Font sizes
  // Check for inline font-size styles that are too small
  const smallFonts = $('[style*="font-size"]').filter((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/font-size:\s*(\d+)px/);
    if (match) {
      return parseInt(match[1], 10) < 14;
    }
    return false;
  }).length;

  if (smallFonts > 5) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'small-fonts'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Small font sizes',
      description: `Found ${smallFonts} elements with font sizes under 14px.`,
      impact: 'Text is hard to read on mobile without zooming, frustrating users.',
      howWeFix: 'We use a minimum 16px base font size for comfortable reading on any device.',
    });
  }

  // Check 5: Mobile-friendly forms
  const forms = $('form').length;
  const inputsWithTypes = $('input[type]').length;
  const textInputs = $('input:not([type]), input[type="text"]').length;

  if (forms > 0 && textInputs > 2 && inputsWithTypes < textInputs) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'form-input-types'),
      category: CATEGORY,
      severity: 'info',
      title: 'Forms missing input types',
      description: 'Some form inputs are missing specific types (email, tel, etc.).',
      impact: 'Mobile keyboards won\'t show the appropriate layout for different input types.',
      howWeFix: 'We use semantic input types so mobile users get the right keyboard.',
    });
  }

  // Check 6: Apple touch icon
  if (!$('link[rel="apple-touch-icon"]').length) {
    score -= 5;
    opportunities.push({
      id: 'mobile-touch-icon',
      category: CATEGORY,
      title: 'Add Apple touch icon',
      description: 'No Apple touch icon for home screen bookmarks.',
      potentialGain: 'Users who bookmark your site see a professional icon instead of a screenshot.',
      implementation: 'Add high-resolution touch icons for iOS devices.',
      priority: 'low',
    });
  }

  // Check 7: Responsive images
  const imagesWithSrcset = $('img[srcset]').length;
  const totalImages = $('img').length;

  if (totalImages > 5 && imagesWithSrcset === 0) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-responsive-images'),
      category: CATEGORY,
      severity: 'warning',
      title: 'No responsive images',
      description: 'No images use srcset for responsive delivery.',
      impact: 'Mobile users download oversized images, wasting data and slowing load times.',
      howWeFix: 'We serve appropriately sized images for each device, saving 40-70% on image bandwidth.',
    });
  }

  // Check 8: Tap delay (check for passive event listeners hint)
  if (!html.includes('touch-action') && !html.includes('passive')) {
    opportunities.push({
      id: 'mobile-tap-delay',
      category: CATEGORY,
      title: 'Optimize tap response',
      description: 'No touch optimization detected.',
      potentialGain: 'Eliminate 300ms tap delay for instant-feeling interactions.',
      implementation: 'Use modern touch event handling and touch-action CSS.',
      priority: 'medium',
    });
  }

  // Opportunities
  if (!$('meta[name="theme-color"]').length) {
    opportunities.push({
      id: 'mobile-theme-color',
      category: CATEGORY,
      title: 'Add theme color',
      description: 'No theme color for mobile browser chrome.',
      potentialGain: 'Browser UI matches your brand for a more polished look.',
      implementation: 'Add a theme-color meta tag matching your brand.',
      priority: 'low',
    });
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    weight: 20, // Mobile is 20% of overall score
    issues,
    opportunities,
    metadata: {
      hasViewport: !!viewportMeta,
      totalImages,
      responsiveImages: imagesWithSrcset,
      forms,
    },
  };
}
