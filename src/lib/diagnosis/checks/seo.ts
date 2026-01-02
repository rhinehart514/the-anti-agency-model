import * as cheerio from 'cheerio';
import type { CheckResult, Issue, Opportunity } from '../types';
import { generateIssueId } from '../types';

const CATEGORY = 'seo';

export async function checkSeo(
  url: string,
  html: string
): Promise<CheckResult> {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const opportunities: Opportunity[] = [];
  let score = 100;

  // Check 1: Title tag
  const title = $('title').text().trim();
  if (!title) {
    score -= 25;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-title'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Missing title tag',
      description: 'No title tag found in the document.',
      impact: 'Search engines won\'t know what your page is about. This is the #1 SEO ranking factor.',
      howWeFix: 'We create compelling, keyword-rich titles that rank and attract clicks.',
    });
  } else if (title.length < 30) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'short-title'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Title too short',
      description: `Title is only ${title.length} characters.`,
      impact: 'Short titles miss opportunities to include keywords and attract clicks.',
      howWeFix: 'We craft 50-60 character titles that maximize visibility and click-through.',
    });
  } else if (title.length > 70) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'long-title'),
      category: CATEGORY,
      severity: 'info',
      title: 'Title may be truncated',
      description: `Title is ${title.length} characters (optimal: 50-60).`,
      impact: 'Long titles get cut off in search results, potentially losing impact.',
      howWeFix: 'We optimize title length to display fully in search results.',
    });
  }

  // Check 2: Meta description
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  if (!metaDesc) {
    score -= 20;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-meta-desc'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Missing meta description',
      description: 'No meta description found.',
      impact: 'Search engines will generate their own snippet, which may not represent your business well.',
      howWeFix: 'We write compelling meta descriptions that improve click-through rates.',
    });
  } else if (metaDesc.length < 70) {
    score -= 10;
    issues.push({
      id: generateIssueId(CATEGORY, 'short-meta-desc'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Meta description too short',
      description: `Meta description is only ${metaDesc.length} characters.`,
      impact: 'Short descriptions don\'t fully utilize the space Google gives you in search results.',
      howWeFix: 'We write 150-160 character descriptions that maximize your search presence.',
    });
  } else if (metaDesc.length > 160) {
    score -= 3;
    issues.push({
      id: generateIssueId(CATEGORY, 'long-meta-desc'),
      category: CATEGORY,
      severity: 'info',
      title: 'Meta description may be truncated',
      description: `Meta description is ${metaDesc.length} characters.`,
      impact: 'Long descriptions get cut off in search results.',
      howWeFix: 'We optimize description length for full display.',
    });
  }

  // Check 3: H1 tag
  const h1Tags = $('h1');
  if (h1Tags.length === 0) {
    score -= 15;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-h1'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Missing H1 heading',
      description: 'No H1 heading found on the page.',
      impact: 'Search engines use the H1 to understand your page\'s main topic.',
      howWeFix: 'We add a clear, keyword-rich H1 heading to every page.',
    });
  } else if (h1Tags.length > 1) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'multiple-h1'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Multiple H1 headings',
      description: `Found ${h1Tags.length} H1 headings.`,
      impact: 'Multiple H1s can confuse search engines about your page\'s main topic.',
      howWeFix: 'We use a single H1 per page with supporting H2-H6 headings.',
    });
  }

  // Check 4: Heading hierarchy
  const h2s = $('h2').length;
  const h3s = $('h3').length;
  if (h2s === 0 && $('p').length > 5) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-h2'),
      category: CATEGORY,
      severity: 'warning',
      title: 'No subheadings',
      description: 'Page has content but no H2 subheadings.',
      impact: 'Content is harder to scan and search engines can\'t understand the structure.',
      howWeFix: 'We organize content with clear heading hierarchies for better SEO and readability.',
    });
  }

  // Check 5: Images without alt text
  const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;
  const totalImages = $('img').length;
  if (imagesWithoutAlt > 0) {
    score -= Math.min(15, imagesWithoutAlt * 3);
    issues.push({
      id: generateIssueId(CATEGORY, 'images-no-alt'),
      category: CATEGORY,
      severity: imagesWithoutAlt > 3 ? 'critical' : 'warning',
      title: 'Images missing alt text',
      description: `${imagesWithoutAlt} of ${totalImages} images have no alt text.`,
      impact: 'Search engines can\'t understand your images, missing valuable ranking opportunities.',
      howWeFix: 'We add descriptive alt text to every image for better SEO and accessibility.',
    });
  }

  // Check 6: Canonical URL
  if (!$('link[rel="canonical"]').length) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'no-canonical'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Missing canonical URL',
      description: 'No canonical link tag found.',
      impact: 'Duplicate content issues may dilute your SEO efforts.',
      howWeFix: 'We add canonical URLs to prevent duplicate content problems.',
    });
  }

  // Check 7: Open Graph tags
  const hasOgTitle = $('meta[property="og:title"]').length > 0;
  const hasOgDesc = $('meta[property="og:description"]').length > 0;
  const hasOgImage = $('meta[property="og:image"]').length > 0;

  if (!hasOgTitle || !hasOgDesc || !hasOgImage) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'incomplete-og'),
      category: CATEGORY,
      severity: 'warning',
      title: 'Incomplete Open Graph tags',
      description: 'Missing og:title, og:description, or og:image.',
      impact: 'Social shares look unprofessional without proper preview images and text.',
      howWeFix: 'We add complete Open Graph tags for beautiful social sharing.',
    });
  }

  // Check 8: Structured data
  const hasStructuredData = $('script[type="application/ld+json"]').length > 0;
  if (!hasStructuredData) {
    score -= 5;
    opportunities.push({
      id: 'seo-structured-data',
      category: CATEGORY,
      title: 'Add structured data',
      description: 'No JSON-LD structured data found.',
      potentialGain: 'Rich snippets in search results can increase clicks by 30%.',
      implementation: 'Add LocalBusiness or Organization schema for rich search results.',
      priority: 'high',
    });
  }

  // Check 9: Internal links
  const internalLinks = $('a[href^="/"], a[href^="' + url + '"]').length;
  if (internalLinks < 3) {
    score -= 5;
    issues.push({
      id: generateIssueId(CATEGORY, 'few-internal-links'),
      category: CATEGORY,
      severity: 'info',
      title: 'Few internal links',
      description: `Only ${internalLinks} internal links found.`,
      impact: 'Internal linking helps search engines discover and understand your content.',
      howWeFix: 'We add strategic internal links to help search engines crawl your site.',
    });
  }

  // Check 10: Robots meta
  const robotsMeta = $('meta[name="robots"]').attr('content') || '';
  if (robotsMeta.includes('noindex')) {
    score -= 20;
    issues.push({
      id: generateIssueId(CATEGORY, 'noindex'),
      category: CATEGORY,
      severity: 'critical',
      title: 'Page blocked from indexing',
      description: 'Page has noindex directive.',
      impact: 'This page will NOT appear in search results at all.',
      howWeFix: 'We remove the noindex directive so your page can rank.',
    });
  }

  // Opportunities
  opportunities.push({
    id: 'seo-local',
    category: CATEGORY,
    title: 'Local SEO optimization',
    description: 'Add local business signals.',
    potentialGain: 'Appear in local pack results for nearby customers.',
    implementation: 'Add LocalBusiness schema, Google Business Profile integration, and local content.',
    priority: 'high',
  });

  if (!html.toLowerCase().includes('blog') && !html.toLowerCase().includes('article')) {
    opportunities.push({
      id: 'seo-content',
      category: CATEGORY,
      title: 'Add a blog or content section',
      description: 'No blog or article content detected.',
      potentialGain: 'Regular content can increase organic traffic by 3-5x over time.',
      implementation: 'Add a blog with helpful articles related to your services.',
      priority: 'medium',
    });
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    weight: 20, // SEO is 20% of overall score
    issues,
    opportunities,
    metadata: {
      title,
      titleLength: title.length,
      metaDescLength: metaDesc.length,
      h1Count: h1Tags.length,
      h2Count: h2s,
      imagesWithoutAlt,
      hasStructuredData,
      hasOpenGraph: hasOgTitle && hasOgDesc && hasOgImage,
    },
  };
}
