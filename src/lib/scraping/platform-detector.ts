import * as cheerio from 'cheerio';
import type { SitePlatform, PlatformDetectionResult } from './types';

// Use inferred type from cheerio.load() for better compatibility
type CheerioAPI = ReturnType<typeof cheerio.load>;

interface PlatformSignature {
  platform: SitePlatform;
  patterns: {
    scripts?: RegExp[];
    meta?: { name: string; content: RegExp }[];
    links?: RegExp[];
    html?: RegExp[];
    headers?: { name: string; value: RegExp }[];
  };
}

const PLATFORM_SIGNATURES: PlatformSignature[] = [
  {
    platform: 'squarespace',
    patterns: {
      scripts: [
        /static\.squarespace\.com/i,
        /squarespace\.com\/universal/i,
        /squarespace-cdn\.com/i,
      ],
      meta: [
        { name: 'generator', content: /squarespace/i },
      ],
      html: [
        /class="sqs-/i,
        /data-squarespace/i,
        /sqsp-/i,
      ],
    },
  },
  {
    platform: 'wix',
    patterns: {
      scripts: [
        /static\.wixstatic\.com/i,
        /wix\.com\/wix-labs/i,
        /parastorage\.com/i,
      ],
      meta: [
        { name: 'generator', content: /wix\.com/i },
      ],
      html: [
        /wix-dropdown/i,
        /data-testid="[^"]*wix/i,
        /comp-[a-z0-9]{8,}/i,
      ],
    },
  },
  {
    platform: 'wordpress',
    patterns: {
      scripts: [
        /wp-content\//i,
        /wp-includes\//i,
        /wp-json/i,
      ],
      meta: [
        { name: 'generator', content: /wordpress/i },
      ],
      links: [
        /wp-content\/themes/i,
        /wp-content\/plugins/i,
      ],
      html: [
        /class="wp-/i,
        /id="wp-/i,
      ],
    },
  },
  {
    platform: 'shopify',
    patterns: {
      scripts: [
        /cdn\.shopify\.com/i,
        /shopify\.com\/s\/files/i,
      ],
      meta: [
        { name: 'shopify-checkout-api-token', content: /.+/ },
      ],
      html: [
        /Shopify\.theme/i,
        /shopify-section/i,
      ],
    },
  },
  {
    platform: 'godaddy',
    patterns: {
      scripts: [
        /godaddy\.com/i,
        /secureserver\.net/i,
        /wsimg\.com/i,
      ],
      meta: [
        { name: 'generator', content: /godaddy/i },
        { name: 'generator', content: /website builder/i },
      ],
      html: [
        /data-ux=/i,
        /class="x-el/i,
      ],
    },
  },
  {
    platform: 'weebly',
    patterns: {
      scripts: [
        /weebly\.com/i,
        /editmysite\.com/i,
      ],
      meta: [
        { name: 'generator', content: /weebly/i },
      ],
      html: [
        /wsite-/i,
        /weebly-/i,
      ],
    },
  },
  {
    platform: 'webflow',
    patterns: {
      scripts: [
        /webflow\.com/i,
        /assets\.website-files\.com/i,
        /uploads-ssl\.webflow\.com/i,
      ],
      meta: [
        { name: 'generator', content: /webflow/i },
      ],
      html: [
        /class="w-/i,
        /data-wf-/i,
        /w-nav/i,
      ],
    },
  },
];

export function detectPlatform(
  $: CheerioAPI,
  html: string,
  headers?: Record<string, string>
): PlatformDetectionResult {
  const indicators: string[] = [];
  let detectedPlatform: SitePlatform = 'unknown';
  let highestScore = 0;

  for (const signature of PLATFORM_SIGNATURES) {
    let score = 0;
    const platformIndicators: string[] = [];

    // Check scripts
    if (signature.patterns.scripts) {
      $('script[src]').each((_, el) => {
        const src = $(el).attr('src') || '';
        for (const pattern of signature.patterns.scripts!) {
          if (pattern.test(src)) {
            score += 3;
            platformIndicators.push(`Script: ${src.substring(0, 50)}...`);
          }
        }
      });
    }

    // Check meta tags
    if (signature.patterns.meta) {
      for (const meta of signature.patterns.meta) {
        const content = $(`meta[name="${meta.name}"]`).attr('content') || '';
        if (meta.content.test(content)) {
          score += 5;
          platformIndicators.push(`Meta ${meta.name}: ${content}`);
        }
      }
    }

    // Check link tags
    if (signature.patterns.links) {
      $('link[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        for (const pattern of signature.patterns.links!) {
          if (pattern.test(href)) {
            score += 2;
            platformIndicators.push(`Link: ${href.substring(0, 50)}...`);
          }
        }
      });
    }

    // Check HTML patterns
    if (signature.patterns.html) {
      for (const pattern of signature.patterns.html) {
        if (pattern.test(html)) {
          score += 2;
          platformIndicators.push(`HTML pattern: ${pattern.source}`);
        }
      }
    }

    // Check headers
    if (signature.patterns.headers && headers) {
      for (const header of signature.patterns.headers) {
        const value = headers[header.name.toLowerCase()] || '';
        if (header.value.test(value)) {
          score += 4;
          platformIndicators.push(`Header ${header.name}: ${value}`);
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      detectedPlatform = signature.platform;
      indicators.length = 0;
      indicators.push(...platformIndicators);
    }
  }

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low';
  if (highestScore >= 10) {
    confidence = 'high';
  } else if (highestScore >= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    platform: detectedPlatform,
    confidence,
    indicators,
  };
}

export function getPlatformInfo(platform: SitePlatform): {
  name: string;
  requiresJavaScript: boolean;
  scraperNotes: string;
} {
  const info: Record<SitePlatform, { name: string; requiresJavaScript: boolean; scraperNotes: string }> = {
    squarespace: {
      name: 'Squarespace',
      requiresJavaScript: false,
      scraperNotes: 'Static HTML, images on CDN',
    },
    wix: {
      name: 'Wix',
      requiresJavaScript: true,
      scraperNotes: 'Heavy JavaScript, requires Puppeteer',
    },
    wordpress: {
      name: 'WordPress',
      requiresJavaScript: false,
      scraperNotes: 'Static HTML, check for REST API',
    },
    shopify: {
      name: 'Shopify',
      requiresJavaScript: false,
      scraperNotes: 'Static HTML with Liquid templates',
    },
    godaddy: {
      name: 'GoDaddy Website Builder',
      requiresJavaScript: true,
      scraperNotes: 'React-based, may need Puppeteer',
    },
    weebly: {
      name: 'Weebly',
      requiresJavaScript: false,
      scraperNotes: 'Static HTML',
    },
    webflow: {
      name: 'Webflow',
      requiresJavaScript: false,
      scraperNotes: 'Static HTML, clean structure',
    },
    unknown: {
      name: 'Unknown Platform',
      requiresJavaScript: false,
      scraperNotes: 'Use generic extractor',
    },
  };

  return info[platform];
}
