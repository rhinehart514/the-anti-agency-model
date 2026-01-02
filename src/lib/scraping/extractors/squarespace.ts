import type {
  ScrapedBusiness,
  ScrapedContent,
  ScrapedAssets,
  ScrapedSeo,
} from '../types';
import {
  type CheerioAPI,
  type Extractor,
  type ExtractorResult,
  cleanText,
  extractEmail,
  extractPhone,
  normalizeUrl,
  extractSocialLinks,
  determinePageType,
} from './base';

export class SquarespaceExtractor implements Extractor {
  name = 'squarespace';

  async extract($: CheerioAPI, url: string, html: string): Promise<ExtractorResult> {
    return {
      business: this.extractBusiness($, html),
      content: this.extractContent($),
      assets: this.extractAssets($, url),
      seo: this.extractSeo($),
      social: extractSocialLinks($),
      pages: [this.extractCurrentPage($, url)],
    };
  }

  private extractBusiness($: CheerioAPI, _html: string): ScrapedBusiness {
    // Squarespace-specific selectors
    const name =
      cleanText($('.site-title, .header-title, .site-branding-text').first().text()) ||
      cleanText($('meta[property="og:site_name"]').attr('content')) ||
      null;

    const tagline =
      cleanText($('.site-tagline, .header-tagline, .sqs-block-html p').first().text()) ||
      null;

    const description =
      cleanText($('meta[name="description"]').attr('content')) ||
      null;

    // Contact info from footer or contact block
    const footerText = $('.footer-section, .site-footer, [data-section-type="footer"]').text();
    const contactText = $('.sqs-block-form, [data-block-type="2"]').text();
    const combinedText = footerText + ' ' + contactText;

    const phone = extractPhone(combinedText);
    const email = extractEmail(combinedText) ||
      $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '').split('?')[0] ||
      null;

    // Address from structured data or footer
    let address: string | null = null;
    const ldJson = $('script[type="application/ld+json"]').html();
    if (ldJson) {
      try {
        const data = JSON.parse(ldJson);
        if (data.address) {
          address = typeof data.address === 'string'
            ? data.address
            : [data.address.streetAddress, data.address.addressLocality, data.address.addressRegion, data.address.postalCode]
                .filter(Boolean).join(', ');
        }
      } catch {
        // Ignore
      }
    }

    return {
      name,
      tagline,
      description,
      phone,
      email,
      address,
      hours: null,
    };
  }

  private extractContent($: CheerioAPI): ScrapedContent {
    // Squarespace uses sqs-block classes
    const heroText =
      cleanText($('.sqs-block-banner h1, .sqs-block-banner .sqsrte-large, [data-block-type="1"] h1').first().text()) ||
      cleanText($('.section-wrapper:first-child h1').first().text()) ||
      null;

    const heroSubtext =
      cleanText($('.sqs-block-banner p, .sqs-block-banner .sqsrte-small').first().text()) ||
      null;

    const aboutText =
      cleanText($('.sqs-block-html p').filter((_, el) => {
        const text = $(el).text();
        return text.length > 100;
      }).first().text()) ||
      null;

    // Services from list blocks or summary blocks
    const services: string[] = [];
    $('.sqs-block-summary-v2 .summary-title, .sqs-block-list li').each((_, el) => {
      const text = cleanText($(el).text());
      if (text && text.length < 100) {
        services.push(text);
      }
    });

    // Testimonials from quote blocks
    const testimonials: ScrapedContent['testimonials'] = [];
    $('.sqs-block-quote, .sqs-block-testimonial, blockquote').each((_, el) => {
      const $el = $(el);
      const text = cleanText($el.find('.quote-text, .sqsrte-large, p').first().text());
      const author = cleanText($el.find('.quote-author, .source, cite').first().text());

      if (text && text.length > 20) {
        testimonials.push({ text, author: author || undefined });
      }
    });

    // Features
    const features: ScrapedContent['features'] = [];
    $('.sqs-block-image + .sqs-block-html, .sqs-gallery-design-list .sqs-gallery-meta-container').each((_, el) => {
      const $el = $(el);
      const title = cleanText($el.find('h3, h4').first().text());
      const description = cleanText($el.find('p').first().text());

      if (title && description) {
        features.push({ title, description });
      }
    });

    // CTA
    const ctaText =
      cleanText($('.sqs-block-button a, .sqs-block-button-element').first().text()) ||
      null;

    return {
      heroText,
      heroSubtext,
      aboutText,
      services,
      testimonials,
      features,
      ctaText,
    };
  }

  private extractAssets($: CheerioAPI, url: string): ScrapedAssets {
    // Logo
    const logo =
      $('.site-logo img, .header-logo img').attr('src') ||
      $('.site-branding-logo img').attr('src') ||
      null;

    // Hero image
    let heroImage =
      $('.sqs-block-banner img, [data-block-type="1"] img').first().attr('src') ||
      null;

    // Check for background images
    if (!heroImage) {
      const bannerStyle = $('.section-background, .sqs-section-background').attr('style') || '';
      const match = bannerStyle.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (match) {
        heroImage = match[1];
      }
    }

    // All images
    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.includes('static.squarespace.com/universal') && !src.includes('favicon')) {
        const normalized = normalizeUrl(src, url);
        if (!images.includes(normalized)) {
          images.push(normalized);
        }
      }
    });

    return {
      logo: logo ? normalizeUrl(logo, url) : null,
      favicon: $('link[rel="icon"]').attr('href') || null,
      heroImage: heroImage ? normalizeUrl(heroImage, url) : null,
      images: images.slice(0, 20),
      videos: [],
    };
  }

  private extractSeo($: CheerioAPI): ScrapedSeo {
    return {
      title: cleanText($('title').text()),
      description: $('meta[name="description"]').attr('content') || null,
      keywords: [],
      ogImage: $('meta[property="og:image"]').attr('content') || null,
      canonicalUrl: $('link[rel="canonical"]').attr('href') || null,
    };
  }

  private extractCurrentPage($: CheerioAPI, url: string): ExtractorResult['pages'][0] {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    const title = cleanText($('title').text());

    const mainContent = cleanText($('.sqs-layout, .sqs-block-content').text());

    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = cleanText($(el).text());
      if (text && !headings.includes(text)) {
        headings.push(text);
      }
    });

    const links: string[] = [];
    $('a[href^="/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!links.includes(href) && !href.includes('#')) {
        links.push(href);
      }
    });

    return {
      url,
      path,
      title,
      type: determinePageType(path, title, mainContent),
      content: mainContent?.substring(0, 5000) || null,
      headings: headings.slice(0, 20),
      links: links.slice(0, 50),
    };
  }
}

export const squarespaceExtractor = new SquarespaceExtractor();
