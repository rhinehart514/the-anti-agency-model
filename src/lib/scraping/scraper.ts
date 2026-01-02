import * as cheerio from 'cheerio';
import type {
  ScrapedSiteData,
  ScrapeOptions,
  ScrapeResult,
  SitePlatform,
} from './types';
import type { CheerioAPI } from './extractors/base';
import { detectPlatform, getPlatformInfo } from './platform-detector';
import { getExtractorForPlatform } from './extractor-registry';
import { logger } from '@/lib/logger';

const DEFAULT_OPTIONS: Required<ScrapeOptions> = {
  timeout: 30000,
  maxPages: 5,
  includeImages: true,
  followLinks: false,
  userAgent:
    'Mozilla/5.0 (compatible; AntiAgencyBot/1.0; +https://theantiagency.com/bot)',
};

const BLOCKED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip',
  '.rar',
  '.exe',
  '.dmg',
];

export async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];

  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol. Must be http or https.');
    }

    // Check for blocked file types
    const pathname = parsedUrl.pathname.toLowerCase();
    if (BLOCKED_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
      throw new Error('URL points to a file, not a webpage.');
    }

    // Fetch the page
    logger.info({ url }, 'Starting scrape');

    const response = await fetchWithTimeout(url, opts.timeout, opts.userAgent);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Detect platform
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const platformDetection = detectPlatform($, html, headers);
    const platformInfo = getPlatformInfo(platformDetection.platform);

    logger.info(
      { platform: platformDetection.platform, confidence: platformDetection.confidence },
      'Platform detected'
    );

    // Check if we need Puppeteer for JS-heavy sites
    let finalHtml = html;
    let final$ = $;

    if (platformInfo.requiresJavaScript && isContentEmpty($)) {
      logger.info('Content appears empty, trying Puppeteer');
      try {
        const puppeteerResult = await scrapeWithPuppeteer(url, opts.timeout);
        finalHtml = puppeteerResult.html;
        final$ = cheerio.load(finalHtml);
      } catch (puppeteerError) {
        const errorMsg = puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error';
        errors.push(`Puppeteer fallback failed: ${errorMsg}`);
        logger.warn({ error: errorMsg }, 'Puppeteer fallback failed');
      }
    }

    // Extract data using the appropriate extractor for the detected platform
    const extractor = getExtractorForPlatform(platformDetection.platform);
    logger.info({ extractor: extractor.name }, 'Using extractor');
    const extracted = await extractor.extract(final$, url, finalHtml);

    const scrapedData: ScrapedSiteData = {
      url,
      platform: platformDetection.platform,
      business: extracted.business,
      content: extracted.content,
      assets: extracted.assets,
      seo: extracted.seo,
      social: extracted.social,
      pages: extracted.pages,
      scrapedAt: new Date(),
      scrapeErrors: errors,
    };

    // Optionally follow links to scrape more pages
    if (opts.followLinks && opts.maxPages > 1) {
      const additionalPages = await scrapeAdditionalPages(
        url,
        extracted.pages[0].links,
        opts,
        platformDetection.platform
      );
      scrapedData.pages.push(...additionalPages);
    }

    const duration = Date.now() - startTime;
    logger.info({ url, duration, pageCount: scrapedData.pages.length }, 'Scrape completed');

    return {
      success: true,
      data: scrapedData,
      errors,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ url, error: errorMsg }, 'Scrape failed');

    return {
      success: false,
      data: null,
      errors: [errorMsg, ...errors],
      duration: Date.now() - startTime,
    };
  }
}

async function fetchWithTimeout(
  url: string,
  timeout: number,
  userAgent: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isContentEmpty($: CheerioAPI): boolean {
  // Check if the page has meaningful content
  const bodyText = $('body').text().trim();
  const hasMainContent = $('main, article, .content, #content').length > 0;
  const headingCount = $('h1, h2, h3').length;

  // If body text is very short and no meaningful structure, likely JS-rendered
  return bodyText.length < 500 && !hasMainContent && headingCount < 2;
}

async function scrapeWithPuppeteer(
  url: string,
  timeout: number
): Promise<{ html: string }> {
  // Dynamic import to avoid loading Puppeteer unless needed
  const puppeteer = await import('puppeteer');

  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // Wait for content to render
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

    // Get the rendered HTML
    const html = await page.content();

    return { html };
  } finally {
    await browser.close();
  }
}

async function scrapeAdditionalPages(
  baseUrl: string,
  links: string[],
  opts: Required<ScrapeOptions>,
  platform: SitePlatform
): Promise<ScrapedSiteData['pages']> {
  const pages: ScrapedSiteData['pages'] = [];
  const baseHost = new URL(baseUrl).host;
  const scrapedPaths = new Set<string>(['/']);
  const extractor = getExtractorForPlatform(platform);

  // Filter and prioritize links
  const prioritizedLinks = links
    .filter(link => {
      // Only internal links
      if (link.startsWith('http')) {
        try {
          return new URL(link).host === baseHost;
        } catch {
          return false;
        }
      }
      return link.startsWith('/');
    })
    .filter(link => {
      // Skip common non-content links
      const skipPatterns = [
        /^\/wp-/,
        /\/feed\/?$/,
        /\/rss\/?$/,
        /\.(pdf|jpg|png|gif|css|js)$/i,
        /^\/cdn-cgi\//,
        /^\/api\//,
      ];
      return !skipPatterns.some(p => p.test(link));
    })
    .slice(0, opts.maxPages - 1);

  for (const link of prioritizedLinks) {
    const fullUrl = link.startsWith('http') ? link : `${new URL(baseUrl).origin}${link}`;
    const path = new URL(fullUrl).pathname;

    if (scrapedPaths.has(path)) continue;
    scrapedPaths.add(path);

    try {
      const response = await fetchWithTimeout(fullUrl, opts.timeout, opts.userAgent);
      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      const extracted = await extractor.extract($, fullUrl, html);
      pages.push(...extracted.pages);
    } catch {
      // Skip failed pages
      continue;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return pages;
}

// Export for testing
export { fetchWithTimeout, isContentEmpty };
