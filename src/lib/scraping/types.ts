import { z } from 'zod';

// Platform detection
export type SitePlatform =
  | 'squarespace'
  | 'wix'
  | 'wordpress'
  | 'shopify'
  | 'godaddy'
  | 'weebly'
  | 'webflow'
  | 'unknown';

// Scraped business information
export interface ScrapedBusiness {
  name: string | null;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
}

// Scraped content
export interface ScrapedContent {
  heroText: string | null;
  heroSubtext: string | null;
  aboutText: string | null;
  services: string[];
  testimonials: Array<{
    text: string;
    author?: string;
    role?: string;
    company?: string;
  }>;
  features: Array<{
    title: string;
    description: string;
  }>;
  ctaText: string | null;
}

// Scraped assets
export interface ScrapedAssets {
  logo: string | null;
  favicon: string | null;
  heroImage: string | null;
  images: string[];
  videos: string[];
}

// Scraped SEO data
export interface ScrapedSeo {
  title: string | null;
  description: string | null;
  keywords: string[];
  ogImage: string | null;
  canonicalUrl: string | null;
}

// Social links
export interface ScrapedSocial {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  pinterest?: string;
  yelp?: string;
  googleBusiness?: string;
}

// Complete scraped site data
export interface ScrapedSiteData {
  url: string;
  platform: SitePlatform;
  business: ScrapedBusiness;
  content: ScrapedContent;
  assets: ScrapedAssets;
  seo: ScrapedSeo;
  social: ScrapedSocial;
  pages: ScrapedPage[];
  scrapedAt: Date;
  scrapeErrors: string[];
}

// Individual scraped page
export interface ScrapedPage {
  url: string;
  path: string;
  title: string | null;
  type: 'home' | 'about' | 'services' | 'contact' | 'blog' | 'portfolio' | 'pricing' | 'other';
  content: string | null;
  headings: string[];
  links: string[];
}

// Scrape options
export interface ScrapeOptions {
  timeout?: number;
  maxPages?: number;
  includeImages?: boolean;
  followLinks?: boolean;
  userAgent?: string;
}

// Scrape result
export interface ScrapeResult {
  success: boolean;
  data: ScrapedSiteData | null;
  errors: string[];
  duration: number;
}

// Platform detection result
export interface PlatformDetectionResult {
  platform: SitePlatform;
  confidence: 'high' | 'medium' | 'low';
  indicators: string[];
}

// Zod schemas for validation
export const ScrapedBusinessSchema = z.object({
  name: z.string().nullable(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  hours: z.string().nullable(),
});

export const ScrapedSeoSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  keywords: z.array(z.string()),
  ogImage: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
});

export const ScrapedSiteDataSchema = z.object({
  url: z.string().url(),
  platform: z.enum([
    'squarespace',
    'wix',
    'wordpress',
    'shopify',
    'godaddy',
    'weebly',
    'webflow',
    'unknown',
  ]),
  business: ScrapedBusinessSchema,
  seo: ScrapedSeoSchema,
  scrapedAt: z.date(),
});
