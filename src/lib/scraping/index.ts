// Main scraping exports
export { scrapeUrl } from './scraper';
export { detectPlatform, getPlatformInfo } from './platform-detector';

// Types
export type {
  ScrapedSiteData,
  ScrapedBusiness,
  ScrapedContent,
  ScrapedAssets,
  ScrapedSeo,
  ScrapedSocial,
  ScrapedPage,
  SitePlatform,
  ScrapeOptions,
  ScrapeResult,
  PlatformDetectionResult,
} from './types';

// Extractors
export { genericExtractor } from './extractors/generic';
export { squarespaceExtractor } from './extractors/squarespace';
export { wixExtractor } from './extractors/wix';
export { wordpressExtractor } from './extractors/wordpress';
export { godaddyExtractor } from './extractors/godaddy';
export { getExtractorForPlatform } from './extractor-registry';
