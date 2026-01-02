import * as cheerio from 'cheerio';
import type { CheckResult, Issue, Opportunity } from '../types';
import { generateIssueId } from '../types';

const CATEGORY = 'performance';

export async function checkPerformance(
  url: string,
  html: string
): Promise<CheckResult> {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const opportunities: Opportunity[] = [];
  let score = 100;

  // Check 1: Large images without lazy loading
  const imagesWithoutLazy = $('img:not([loading="lazy"])').length;
  const totalImages = $('img').length;

  if (imagesWithoutLazy > 3 && totalImages > 0) {
    const percentage = Math.round((imagesWithoutLazy / totalImages) * 100);
    score -= Math.min(15, imagesWithoutLazy * 2);
    issues.push({
      id: generateIssueId(CATEGORY, 'images-no-lazy'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Images without lazy loading',
      description: `${imagesWithoutLazy} of ${totalImages} images (${percentage}%) are not using lazy loading.`,
      impact: 'Images load immediately, slowing initial page load and wasting bandwidth for users.',
      howWeFix: 'We automatically add lazy loading to all images below the fold, reducing initial load time by up to 50%.',
      technicalDetails: `Add loading="lazy" to img tags`,
    });
  }

  // Check 2: Missing image dimensions
  const imagesWithoutDimensions = $('img:not([width]):not([height])').length;
  if (imagesWithoutDimensions > 2) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'images-no-dimensions'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Images missing dimensions',
      description: `${imagesWithoutDimensions} images don't have width/height attributes.`,
      impact: 'Causes layout shifts as images load, hurting user experience and Core Web Vitals.',
      howWeFix: 'We specify image dimensions to prevent layout shifts and improve CLS scores.',
    });
  }

  // Check 3: Inline CSS bloat
  const inlineStyles = $('[style]').length;
  if (inlineStyles > 20) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'inline-styles'),
      category: CATEGORY,
      severity: 'info',
      title: 'Excessive inline styles',
      description: `Found ${inlineStyles} elements with inline styles.`,
      impact: 'Increases page size and makes styling harder to maintain.',
      howWeFix: 'We use efficient CSS classes instead of inline styles for smaller file sizes.',
    });
  }

  // Check 4: External scripts blocking render
  const blockingScripts = $('head script[src]:not([async]):not([defer])').length;
  if (blockingScripts > 2) {
    score -= 15;
    issues.push({
      id: generateIssueId(CATEGORY, 'blocking-scripts'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Render-blocking scripts',
      description: `${blockingScripts} scripts in the head block page rendering.`,
      impact: 'Users see a blank page while scripts download, significantly slowing perceived load time.',
      howWeFix: 'We defer non-critical scripts and load them asynchronously for faster first paint.',
    });
  }

  // Check 5: Large HTML document
  const htmlSize = html.length;
  if (htmlSize > 500000) { // 500KB
    score -= 15;
    issues.push({
      id: generateIssueId(CATEGORY, 'large-html'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Large HTML document',
      description: `HTML document is ${Math.round(htmlSize / 1024)}KB.`,
      impact: 'Large documents take longer to download and parse, especially on slow connections.',
      howWeFix: 'We build optimized, minimal HTML that loads in under a second.',
    });
  } else if (htmlSize > 200000) {
    score -= 5;
  }

  // Check 6: No caching hints
  const hasCacheHeaders = html.includes('Cache-Control') || html.includes('cache-control');
  if (!hasCacheHeaders) {
    opportunities.push({
      id: 'perf-caching',
      category: CATEGORY,
      title: 'Enable browser caching',
      description: 'No caching directives detected.',
      potentialGain: 'Return visitors load 50-70% faster with proper caching.',
      implementation: 'Configure cache headers for static assets.',
      priority: 'medium',
    });
  }

  // Check 7: Too many HTTP requests (count resources)
  const externalScripts = $('script[src]').length;
  const externalStyles = $('link[rel="stylesheet"]').length;
  const totalRequests = externalScripts + externalStyles;

  if (totalRequests > 20) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'many-requests'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Too many HTTP requests',
      description: `Page requires ${totalRequests}+ external resources.`,
      impact: 'Each request adds latency. Mobile users on slow connections suffer the most.',
      howWeFix: 'We bundle and minify resources, cutting requests by 60-80%.',
    });
  }

  // Opportunities
  if (score < 90) {
    opportunities.push({
      id: 'perf-cdn',
      category: CATEGORY,
      title: 'Serve assets from CDN',
      description: 'Static assets should be served from a global CDN.',
      potentialGain: 'Reduce latency by 30-50% for users worldwide.',
      implementation: 'We automatically serve all assets through our global CDN.',
      priority: 'high',
    });
  }

  if (!$('link[rel="preconnect"]').length) {
    opportunities.push({
      id: 'perf-preconnect',
      category: CATEGORY,
      title: 'Add preconnect hints',
      description: 'Preconnect to important third-party domains.',
      potentialGain: 'Save 100-500ms on third-party resource loading.',
      implementation: 'Add preconnect links for external resources.',
      priority: 'low',
    });
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    weight: 20, // Performance is 20% of overall score
    issues,
    opportunities,
    metadata: {
      totalImages,
      imagesWithoutLazy,
      blockingScripts,
      htmlSizeKb: Math.round(htmlSize / 1024),
      externalResources: totalRequests,
    },
  };
}
