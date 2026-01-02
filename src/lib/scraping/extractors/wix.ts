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

export class WixExtractor implements Extractor {
  name = 'wix';

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
    // Wix uses data-testid and specific component patterns
    const name =
      cleanText($('[data-testid="logo"] span, [data-hook="site-name"]').first().text()) ||
      cleanText($('meta[property="og:site_name"]').attr('content')) ||
      cleanText($('[class*="siteHeader"] [class*="logo"]').first().text()) ||
      null;

    const tagline =
      cleanText($('[data-testid="tagline"], [data-hook="tagline"]').first().text()) ||
      null;

    const description =
      cleanText($('meta[name="description"]').attr('content')) ||
      null;

    // Contact from footer or contact section
    const footerText = $('[data-testid*="footer"], [class*="footer"]').text();
    const contactText = $('[data-testid*="contact"], [class*="contact"]').text();
    const combinedText = footerText + ' ' + contactText;

    const phone = extractPhone(combinedText) ||
      $('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') ||
      null;

    const email = extractEmail(combinedText) ||
      $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '').split('?')[0] ||
      null;

    // Try to get address from structured data
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
        // Ignore JSON parse errors
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
    // Wix uses comp-* ids and specific data attributes
    const heroText =
      cleanText($('[data-testid*="header"] h1, [class*="hero"] h1, [data-hook="heading"]').first().text()) ||
      cleanText($('h1').first().text()) ||
      null;

    const heroSubtext =
      cleanText($('[data-testid*="header"] p, [class*="hero"] p').first().text()) ||
      null;

    // About section
    const aboutText =
      cleanText($('[data-testid*="about"] p, [class*="about"] p').first().text()) ||
      cleanText($('p').filter((_, el) => $(el).text().length > 100).first().text()) ||
      null;

    // Services
    const services: string[] = [];
    $('[data-testid*="service"] h3, [class*="service"] h3, [data-hook="repeater-item"] h3').each((_, el) => {
      const text = cleanText($(el).text());
      if (text && text.length < 100) {
        services.push(text);
      }
    });

    // Testimonials
    const testimonials: ScrapedContent['testimonials'] = [];
    $('[data-testid*="testimonial"], [class*="testimonial"], blockquote').each((_, el) => {
      const $el = $(el);
      const text = cleanText($el.find('p, [class*="text"]').first().text() || $el.text());
      const author = cleanText($el.find('[class*="name"], [class*="author"]').first().text());

      if (text && text.length > 20 && text.length < 500) {
        testimonials.push({ text, author: author || undefined });
      }
    });

    // Features
    const features: ScrapedContent['features'] = [];
    $('[data-testid*="feature"], [class*="feature"]').each((_, el) => {
      const $el = $(el);
      const title = cleanText($el.find('h3, h4, [class*="title"]').first().text());
      const description = cleanText($el.find('p, [class*="description"]').first().text());

      if (title && description) {
        features.push({ title, description });
      }
    });

    // CTA buttons
    const ctaText =
      cleanText($('[data-testid*="button"], [class*="cta"] button, [class*="button"]').first().text()) ||
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
    // Wix images are often loaded via wixstatic CDN
    const logo =
      $('[data-testid="logo"] img, [data-hook="logo"] img').attr('src') ||
      $('[class*="logo"] img').first().attr('src') ||
      null;

    // Hero image
    let heroImage =
      $('[data-testid*="header"] img, [class*="hero"] img').first().attr('src') ||
      null;

    // Wix often uses background images with wix-image
    if (!heroImage) {
      const wixImage = $('wix-image, [data-testid*="bg-image"]').first().attr('src');
      if (wixImage) {
        heroImage = wixImage;
      }
    }

    // All images
    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.includes('static.wixstatic.com/media') && !src.includes('favicon')) {
        const normalized = normalizeUrl(src, url);
        if (!images.includes(normalized)) {
          images.push(normalized);
        }
      }
    });

    // Also check wix-image elements
    $('wix-image[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
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
      keywords: ($('meta[name="keywords"]').attr('content') || '')
        .split(',')
        .map(k => k.trim())
        .filter(Boolean),
      ogImage: $('meta[property="og:image"]').attr('content') || null,
      canonicalUrl: $('link[rel="canonical"]').attr('href') || null,
    };
  }

  private extractCurrentPage($: CheerioAPI, url: string): ExtractorResult['pages'][0] {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    const title = cleanText($('title').text());

    const mainContent = cleanText($('main, [role="main"], [data-testid="page"]').text());

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

export const wixExtractor = new WixExtractor();
