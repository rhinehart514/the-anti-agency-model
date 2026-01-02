import * as cheerio from 'cheerio';
import type {
  ScrapedBusiness,
  ScrapedContent,
  ScrapedAssets,
  ScrapedSeo,
  ScrapedSocial,
  ScrapedPage,
} from '../types';

// Use inferred type from cheerio.load() for better compatibility
export type CheerioAPI = ReturnType<typeof cheerio.load>;

export interface ExtractorResult {
  business: ScrapedBusiness;
  content: ScrapedContent;
  assets: ScrapedAssets;
  seo: ScrapedSeo;
  social: ScrapedSocial;
  pages: ScrapedPage[];
}

export interface Extractor {
  name: string;
  extract($: CheerioAPI, url: string, html: string): Promise<ExtractorResult>;
}

// Utility functions for all extractors
export function cleanText(text: string | undefined | null): string | null {
  if (!text) return null;
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\n\r\t]/g, ' ')
    .trim() || null;
}

export function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

export function extractPhone(text: string): string | null {
  // Match various phone formats
  const patterns = [
    /\+?1?\s*\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/,
    /\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/,
    /[0-9]{3}[-.\s]?[0-9]{4}/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Normalize the phone number
      const digits = match[0].replace(/\D/g, '');
      if (digits.length >= 10) {
        return match[0];
      }
    }
  }
  return null;
}

export function extractAddress(text: string): string | null {
  // Look for common address patterns
  const patterns = [
    // Street address with city, state zip
    /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)[,.\s]+[\w\s]+[,.\s]+[A-Z]{2}\s+\d{5}/i,
    // Just city, state zip
    /[\w\s]+[,.\s]+[A-Z]{2}\s+\d{5}/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return cleanText(match[0]);
    }
  }
  return null;
}

export function normalizeUrl(url: string, baseUrl: string): string {
  try {
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.origin}${url}`;
    }
    if (!url.startsWith('http')) {
      const base = new URL(baseUrl);
      return `${base.origin}/${url}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function isValidImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
  const lowercaseUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowercaseUrl.includes(ext)) ||
    lowercaseUrl.includes('/image') ||
    lowercaseUrl.includes('img');
}

export function extractSocialLinks($: CheerioAPI): ScrapedSocial {
  const social: ScrapedSocial = {};

  const socialPatterns: Record<keyof ScrapedSocial, RegExp> = {
    facebook: /facebook\.com\//i,
    instagram: /instagram\.com\//i,
    twitter: /twitter\.com\/|x\.com\//i,
    linkedin: /linkedin\.com\//i,
    youtube: /youtube\.com\//i,
    tiktok: /tiktok\.com\//i,
    pinterest: /pinterest\.com\//i,
    yelp: /yelp\.com\//i,
    googleBusiness: /google\.com\/maps|business\.google\.com/i,
  };

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      if (pattern.test(href) && !social[platform as keyof ScrapedSocial]) {
        social[platform as keyof ScrapedSocial] = href;
      }
    }
  });

  return social;
}

export function determinePageType(
  path: string,
  title: string | null,
  content: string | null
): ScrapedPage['type'] {
  const lowerPath = path.toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  const lowerContent = (content || '').toLowerCase().substring(0, 500);

  if (lowerPath === '/' || lowerPath === '' || lowerPath === '/index') {
    return 'home';
  }
  if (lowerPath.includes('about') || lowerTitle.includes('about')) {
    return 'about';
  }
  if (
    lowerPath.includes('service') ||
    lowerPath.includes('what-we-do') ||
    lowerTitle.includes('service')
  ) {
    return 'services';
  }
  if (lowerPath.includes('contact') || lowerTitle.includes('contact')) {
    return 'contact';
  }
  if (lowerPath.includes('blog') || lowerPath.includes('news') || lowerPath.includes('post')) {
    return 'blog';
  }
  if (
    lowerPath.includes('portfolio') ||
    lowerPath.includes('work') ||
    lowerPath.includes('projects')
  ) {
    return 'portfolio';
  }
  if (lowerPath.includes('pricing') || lowerPath.includes('plans')) {
    return 'pricing';
  }

  return 'other';
}
