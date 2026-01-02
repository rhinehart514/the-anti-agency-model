import type { Extractor } from './extractors/base';
import type { SitePlatform } from './types';
import { genericExtractor } from './extractors/generic';
import { squarespaceExtractor } from './extractors/squarespace';
import { wixExtractor } from './extractors/wix';
import { wordpressExtractor } from './extractors/wordpress';
import { godaddyExtractor } from './extractors/godaddy';

const extractorRegistry: Record<SitePlatform, Extractor> = {
  squarespace: squarespaceExtractor,
  wix: wixExtractor,
  wordpress: wordpressExtractor,
  shopify: genericExtractor, // Use generic for now, can add specific later
  godaddy: godaddyExtractor,
  weebly: genericExtractor, // Use generic for now
  webflow: genericExtractor, // Use generic for now
  unknown: genericExtractor,
};

export function getExtractorForPlatform(platform: SitePlatform): Extractor {
  return extractorRegistry[platform] || genericExtractor;
}

export function getAllExtractors(): Extractor[] {
  return [
    genericExtractor,
    squarespaceExtractor,
    wixExtractor,
    wordpressExtractor,
    godaddyExtractor,
  ];
}
