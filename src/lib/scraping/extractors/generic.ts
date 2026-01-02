import type {
  ScrapedBusiness,
  ScrapedContent,
  ScrapedAssets,
  ScrapedSeo,
  ScrapedPage,
} from '../types';
import {
  type CheerioAPI,
  type Extractor,
  type ExtractorResult,
  cleanText,
  extractEmail,
  extractPhone,
  extractAddress,
  normalizeUrl,
  isValidImageUrl,
  extractSocialLinks,
  determinePageType,
} from './base';

export class GenericExtractor implements Extractor {
  name = 'generic';

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

  private extractBusiness($: CheerioAPI, html: string): ScrapedBusiness {
    // Try to find business name from various sources
    let name =
      cleanText($('meta[property="og:site_name"]').attr('content')) ||
      cleanText($('.logo, .site-logo, [class*="logo"]').first().text()) ||
      cleanText($('header .brand, header .site-name').first().text()) ||
      cleanText($('title').text()?.split('|')[0]?.split('-')[0]) ||
      null;

    // Clean up name - remove common suffixes
    if (name) {
      name = name.replace(/\s*[-|]\s*Home$/i, '').trim();
    }

    // Extract tagline from various sources
    const tagline =
      cleanText($('meta[property="og:description"]').attr('content')) ||
      cleanText($('.tagline, .slogan, [class*="tagline"]').first().text()) ||
      cleanText($('header p, .hero p').first().text()) ||
      null;

    // Try to find description
    const description =
      cleanText($('meta[name="description"]').attr('content')) ||
      cleanText($('.about-text, .about p, [class*="about"] p').first().text()) ||
      null;

    // Extract contact info
    let phone: string | null = null;
    let email: string | null = null;
    let address: string | null = null;

    // Look in common contact areas
    const contactAreas = [
      'footer',
      '.contact',
      '.contact-info',
      '[class*="contact"]',
      'header',
      '.footer',
    ];

    for (const selector of contactAreas) {
      const text = $(selector).text();
      if (text) {
        if (!phone) phone = extractPhone(text);
        if (!email) email = extractEmail(text);
        if (!address) address = extractAddress(text);
      }
    }

    // Look for tel: and mailto: links
    if (!phone) {
      const telLink = $('a[href^="tel:"]').first().attr('href');
      if (telLink) {
        phone = telLink.replace('tel:', '').trim();
      }
    }

    if (!email) {
      const mailtoLink = $('a[href^="mailto:"]').first().attr('href');
      if (mailtoLink) {
        email = mailtoLink.replace('mailto:', '').split('?')[0].trim();
      }
    }

    // Look for address in structured data
    const ldJson = $('script[type="application/ld+json"]').html();
    if (ldJson && !address) {
      try {
        const data = JSON.parse(ldJson);
        if (data.address) {
          const addr = data.address;
          if (typeof addr === 'string') {
            address = addr;
          } else if (addr.streetAddress) {
            address = [
              addr.streetAddress,
              addr.addressLocality,
              addr.addressRegion,
              addr.postalCode,
            ]
              .filter(Boolean)
              .join(', ');
          }
        }
      } catch {
        // JSON parsing failed, ignore
      }
    }

    // Extract hours from structured data or common patterns
    let hours: string | null = null;
    if (ldJson) {
      try {
        const data = JSON.parse(ldJson);
        if (data.openingHours) {
          hours = Array.isArray(data.openingHours)
            ? data.openingHours.join(', ')
            : data.openingHours;
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
      hours,
    };
  }

  private extractContent($: CheerioAPI): ScrapedContent {
    // Extract hero section
    const heroSelectors = [
      '.hero h1',
      '.hero-title',
      '[class*="hero"] h1',
      'header h1',
      '.banner h1',
      'main h1:first-of-type',
    ];

    let heroText: string | null = null;
    let heroSubtext: string | null = null;

    for (const selector of heroSelectors) {
      const el = $(selector).first();
      if (el.length) {
        heroText = cleanText(el.text());
        // Try to get subtext from nearby paragraph
        heroSubtext = cleanText(el.next('p').text()) || cleanText(el.parent().find('p').first().text());
        break;
      }
    }

    // Extract about text
    const aboutSelectors = [
      '.about p',
      '[class*="about"] p',
      '#about p',
      'section[data-section="about"] p',
    ];

    let aboutText: string | null = null;
    for (const selector of aboutSelectors) {
      const text = cleanText($(selector).first().text());
      if (text && text.length > 50) {
        aboutText = text;
        break;
      }
    }

    // Extract services
    const services: string[] = [];
    const serviceSelectors = [
      '.services li',
      '[class*="service"] h3',
      '[class*="service"] h4',
      '.service-item h3',
      '.service-card h3',
    ];

    for (const selector of serviceSelectors) {
      $(selector).each((_, el) => {
        const text = cleanText($(el).text());
        if (text && text.length < 100 && !services.includes(text)) {
          services.push(text);
        }
      });
      if (services.length > 0) break;
    }

    // Extract testimonials
    const testimonials: ScrapedContent['testimonials'] = [];
    const testimonialSelectors = [
      '.testimonial',
      '[class*="testimonial"]',
      '.review',
      '[class*="review"]',
      'blockquote',
    ];

    for (const selector of testimonialSelectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        const text = cleanText(
          $el.find('p, .text, .quote, [class*="text"]').first().text() ||
          $el.text()
        );

        if (text && text.length > 20 && text.length < 500) {
          const author = cleanText(
            $el.find('.author, .name, [class*="author"], cite').first().text()
          );
          const role = cleanText(
            $el.find('.role, .title, .position, [class*="role"]').first().text()
          );
          const company = cleanText(
            $el.find('.company, [class*="company"]').first().text()
          );

          testimonials.push({ text, author: author || undefined, role: role || undefined, company: company || undefined });
        }
      });
      if (testimonials.length > 0) break;
    }

    // Extract features
    const features: ScrapedContent['features'] = [];
    const featureSelectors = [
      '.feature',
      '[class*="feature"]',
      '.benefit',
      '[class*="benefit"]',
    ];

    for (const selector of featureSelectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        const title = cleanText($el.find('h3, h4, .title').first().text());
        const description = cleanText($el.find('p, .description').first().text());

        if (title && description) {
          features.push({ title, description });
        }
      });
      if (features.length > 0) break;
    }

    // Extract CTA text
    const ctaSelectors = [
      '.cta a',
      '[class*="cta"] a',
      '.hero a.button',
      '.hero a.btn',
      'a.cta',
    ];

    let ctaText: string | null = null;
    for (const selector of ctaSelectors) {
      const text = cleanText($(selector).first().text());
      if (text && text.length < 50) {
        ctaText = text;
        break;
      }
    }

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

  private extractAssets($: CheerioAPI, baseUrl: string): ScrapedAssets {
    // Extract logo
    let logo: string | null = null;
    const logoSelectors = [
      '.logo img',
      '[class*="logo"] img',
      'header img:first-of-type',
      '.navbar-brand img',
    ];

    for (const selector of logoSelectors) {
      const src = $(selector).first().attr('src');
      if (src) {
        logo = normalizeUrl(src, baseUrl);
        break;
      }
    }

    // Extract favicon
    const favicon =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href') ||
      null;

    // Extract hero image
    let heroImage: string | null = null;
    const heroImageSelectors = [
      '.hero img',
      '[class*="hero"] img',
      '.banner img',
      'header img[class*="background"]',
    ];

    for (const selector of heroImageSelectors) {
      const src = $(selector).first().attr('src');
      if (src && isValidImageUrl(src)) {
        heroImage = normalizeUrl(src, baseUrl);
        break;
      }
    }

    // Also check for background images in style attributes
    if (!heroImage) {
      const heroEl = $('.hero, [class*="hero"], .banner').first();
      const style = heroEl.attr('style') || '';
      const bgMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (bgMatch && bgMatch[1]) {
        heroImage = normalizeUrl(bgMatch[1], baseUrl);
      }
    }

    // Extract all images
    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && isValidImageUrl(src)) {
        const normalizedUrl = normalizeUrl(src, baseUrl);
        if (!images.includes(normalizedUrl)) {
          images.push(normalizedUrl);
        }
      }
    });

    // Extract videos
    const videos: string[] = [];
    $('video source[src], iframe[src*="youtube"], iframe[src*="vimeo"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        videos.push(normalizeUrl(src, baseUrl));
      }
    });

    return {
      logo,
      favicon: favicon ? normalizeUrl(favicon, baseUrl) : null,
      heroImage,
      images: images.slice(0, 20), // Limit to 20 images
      videos: videos.slice(0, 5), // Limit to 5 videos
    };
  }

  private extractSeo($: CheerioAPI): ScrapedSeo {
    const title = cleanText($('title').text());
    const description = $('meta[name="description"]').attr('content') || null;

    // Extract keywords
    const keywordsStr = $('meta[name="keywords"]').attr('content') || '';
    const keywords = keywordsStr
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    const ogImage = $('meta[property="og:image"]').attr('content') || null;
    const canonicalUrl = $('link[rel="canonical"]').attr('href') || null;

    return {
      title,
      description,
      keywords,
      ogImage,
      canonicalUrl,
    };
  }

  private extractCurrentPage($: CheerioAPI, url: string): ScrapedPage {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    const title = cleanText($('title').text());

    // Get main content
    const mainContent = cleanText(
      $('main').text() || $('article').text() || $('body').text()
    );

    // Get headings
    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = cleanText($(el).text());
      if (text && !headings.includes(text)) {
        headings.push(text);
      }
    });

    // Get internal links
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.startsWith('/') && !href.startsWith('//')) {
        if (!links.includes(href)) {
          links.push(href);
        }
      }
    });

    return {
      url,
      path,
      title,
      type: determinePageType(path, title, mainContent),
      content: mainContent?.substring(0, 5000) || null, // Limit content size
      headings: headings.slice(0, 20),
      links: links.slice(0, 50),
    };
  }
}

export const genericExtractor = new GenericExtractor();
