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
  extractAddress,
  normalizeUrl,
  extractSocialLinks,
  determinePageType,
} from './base';

export class WordPressExtractor implements Extractor {
  name = 'wordpress';

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
    // WordPress uses various theme-dependent selectors
    const name =
      cleanText($('.site-title a, .site-title, .custom-logo-link').first().text()) ||
      cleanText($('meta[property="og:site_name"]').attr('content')) ||
      cleanText($('.wp-block-site-title').first().text()) ||
      null;

    const tagline =
      cleanText($('.site-description, .site-tagline').first().text()) ||
      cleanText($('.wp-block-site-tagline').first().text()) ||
      null;

    const description =
      cleanText($('meta[name="description"]').attr('content')) ||
      null;

    // Contact info - WordPress sites often use contact widgets or plugins
    const footerText = $('footer, .site-footer, #footer').text();
    const sidebarText = $('.widget, .sidebar').text();
    const contactPageText = $('.contact-info, .wpcf7, .wpforms').text();
    const combinedText = footerText + ' ' + sidebarText + ' ' + contactPageText;

    const phone = extractPhone(combinedText) ||
      $('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') ||
      null;

    const email = extractEmail(combinedText) ||
      $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '').split('?')[0] ||
      null;

    const address = extractAddress(combinedText);

    // Try to get business hours from structured data (common in local business themes)
    let hours: string | null = null;
    const ldJsonElements = $('script[type="application/ld+json"]');
    ldJsonElements.each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        if (data.openingHours) {
          hours = Array.isArray(data.openingHours)
            ? data.openingHours.join(', ')
            : data.openingHours;
        }
      } catch {
        // Ignore JSON parse errors
      }
    });

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
    // WordPress content is typically in .entry-content or wp-block classes
    const heroText =
      cleanText($('.wp-block-cover h1, .hero h1, .hero-section h1').first().text()) ||
      cleanText($('.entry-title, .page-title, article h1').first().text()) ||
      cleanText($('h1').first().text()) ||
      null;

    const heroSubtext =
      cleanText($('.wp-block-cover p, .hero p').first().text()) ||
      cleanText($('.entry-content > p').first().text()) ||
      null;

    // About section
    const aboutText =
      cleanText($('#about p, .about-section p, .wp-block-group p').first().text()) ||
      cleanText($('.entry-content p').filter((_, el) => $(el).text().length > 100).first().text()) ||
      null;

    // Services - often in wp-block-columns or custom post types
    const services: string[] = [];
    const serviceSelectors = [
      '.wp-block-columns .wp-block-column h3',
      '.services-section h3',
      '.service-item h3',
      '.wp-block-heading',
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

    // Testimonials - common plugins use specific classes
    const testimonials: ScrapedContent['testimonials'] = [];
    const testimonialSelectors = [
      '.wp-block-testimonial',
      '.testimonial-item',
      '.testimonial-content',
      '.review-item',
      'blockquote',
    ];
    for (const selector of testimonialSelectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        const text = cleanText($el.find('p, .content, .quote').first().text() || $el.text());
        const author = cleanText($el.find('.author, .name, cite, .testimonial-author').first().text());
        const role = cleanText($el.find('.title, .position').first().text());

        if (text && text.length > 20 && text.length < 500) {
          testimonials.push({ text, author: author || undefined, role: role || undefined });
        }
      });
      if (testimonials.length > 0) break;
    }

    // Features from block columns or feature sections
    const features: ScrapedContent['features'] = [];
    $('.wp-block-column, .feature-item, .benefit-item').each((_, el) => {
      const $el = $(el);
      const title = cleanText($el.find('h3, h4, .feature-title').first().text());
      const description = cleanText($el.find('p').first().text());

      if (title && description) {
        features.push({ title, description });
      }
    });

    // CTA buttons
    const ctaText =
      cleanText($('.wp-block-button a, .cta-button, .btn-primary').first().text()) ||
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
    // WordPress logo locations
    const logo =
      $('.custom-logo, .site-logo img, .logo img').first().attr('src') ||
      $('.wp-block-site-logo img').attr('src') ||
      null;

    // Hero/featured images
    let heroImage =
      $('.wp-block-cover img, .hero-image img').first().attr('src') ||
      $('.wp-post-image').first().attr('src') ||
      null;

    // Check for background images in cover blocks
    if (!heroImage) {
      const coverStyle = $('.wp-block-cover').attr('style') || '';
      const match = coverStyle.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (match) {
        heroImage = match[1];
      }
    }

    // All images (exclude icons and small images from themes)
    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      const width = parseInt($(el).attr('width') || '0', 10);

      // Skip small images (likely icons) and theme assets
      if (src && width !== 0 && width > 100 && !src.includes('/themes/') && !src.includes('gravatar')) {
        const normalized = normalizeUrl(src, url);
        if (!images.includes(normalized)) {
          images.push(normalized);
        }
      }
    });

    // Videos from wp-block-video or embeds
    const videos: string[] = [];
    $('video source[src], .wp-block-embed-youtube iframe, .wp-block-embed-vimeo iframe').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        videos.push(normalizeUrl(src, url));
      }
    });

    return {
      logo: logo ? normalizeUrl(logo, url) : null,
      favicon: $('link[rel="icon"], link[rel="shortcut icon"]').first().attr('href') || null,
      heroImage: heroImage ? normalizeUrl(heroImage, url) : null,
      images: images.slice(0, 20),
      videos: videos.slice(0, 5),
    };
  }

  private extractSeo($: CheerioAPI): ScrapedSeo {
    // WordPress often has Yoast or other SEO plugins
    return {
      title: cleanText($('title').text()),
      description:
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        null,
      keywords: ($('meta[name="keywords"]').attr('content') || '')
        .split(',')
        .map(k => k.trim())
        .filter(Boolean),
      ogImage: $('meta[property="og:image"]').attr('content') || null,
      canonicalUrl:
        $('link[rel="canonical"]').attr('href') ||
        $('meta[property="og:url"]').attr('content') ||
        null,
    };
  }

  private extractCurrentPage($: CheerioAPI, url: string): ExtractorResult['pages'][0] {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    const title = cleanText($('title').text());

    const mainContent = cleanText(
      $('.entry-content, .page-content, main article').text() ||
      $('main').text()
    );

    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = cleanText($(el).text());
      if (text && !headings.includes(text)) {
        headings.push(text);
      }
    });

    // Internal links (excluding admin/login)
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (
        href.startsWith('/') &&
        !href.includes('/wp-admin') &&
        !href.includes('/wp-login') &&
        !href.includes('/wp-content') &&
        !links.includes(href)
      ) {
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

export const wordpressExtractor = new WordPressExtractor();
