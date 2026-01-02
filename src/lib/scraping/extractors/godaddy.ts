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

export class GoDaddyExtractor implements Extractor {
  name = 'godaddy';

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
    // GoDaddy Website Builder uses data-ux and x-el classes
    const name =
      cleanText($('[data-ux="Logo"] span, [data-ux="SiteName"]').first().text()) ||
      cleanText($('meta[property="og:site_name"]').attr('content')) ||
      cleanText($('[class*="Logo"] span').first().text()) ||
      null;

    const tagline =
      cleanText($('[data-ux="Tagline"], [data-ux="HeroText"]').first().text()) ||
      null;

    const description =
      cleanText($('meta[name="description"]').attr('content')) ||
      null;

    // Contact info from footer or contact section
    const footerText = $('[data-ux="Footer"], footer').text();
    const contactText = $('[data-ux*="Contact"], [class*="contact"]').text();
    const combinedText = footerText + ' ' + contactText;

    const phone = extractPhone(combinedText) ||
      $('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') ||
      cleanText($('[data-ux="ContentText"][href^="tel:"]').text()) ||
      null;

    const email = extractEmail(combinedText) ||
      $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '').split('?')[0] ||
      null;

    const address = extractAddress(combinedText) ||
      cleanText($('[data-ux="ContentText"]').filter((_, el) => {
        const text = $(el).text();
        return /\d+.*street|ave|road|blvd/i.test(text);
      }).first().text()) ||
      null;

    // Business hours from structured data
    let hours: string | null = null;
    const ldJson = $('script[type="application/ld+json"]').html();
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
    // GoDaddy uses data-ux attributes for components
    const heroText =
      cleanText($('[data-ux="HeroHeading"], [data-ux="HeroText"] h1').first().text()) ||
      cleanText($('h1').first().text()) ||
      null;

    const heroSubtext =
      cleanText($('[data-ux="HeroText"] p, [data-ux="HeroSubheading"]').first().text()) ||
      null;

    // About section
    const aboutText =
      cleanText($('[data-ux="ContentText"]').filter((_, el) => $(el).text().length > 100).first().text()) ||
      cleanText($('[data-ux="AboutDescription"]').first().text()) ||
      null;

    // Services from GoDaddy service blocks
    const services: string[] = [];
    $('[data-ux="ContentCardHeading"], [data-ux="ServiceTitle"]').each((_, el) => {
      const text = cleanText($(el).text());
      if (text && text.length < 100 && !services.includes(text)) {
        services.push(text);
      }
    });

    // Testimonials
    const testimonials: ScrapedContent['testimonials'] = [];
    $('[data-ux="Testimonial"], [data-ux="TestimonialCard"]').each((_, el) => {
      const $el = $(el);
      const text = cleanText($el.find('[data-ux="ContentText"], p').first().text());
      const author = cleanText($el.find('[data-ux="AuthorName"], [data-ux="TestimonialAuthor"]').first().text());

      if (text && text.length > 20 && text.length < 500) {
        testimonials.push({ text, author: author || undefined });
      }
    });

    // Features
    const features: ScrapedContent['features'] = [];
    $('[data-ux="ContentCard"], [data-ux="Feature"]').each((_, el) => {
      const $el = $(el);
      const title = cleanText($el.find('[data-ux="ContentCardHeading"], h3, h4').first().text());
      const description = cleanText($el.find('[data-ux="ContentCardText"], p').first().text());

      if (title && description) {
        features.push({ title, description });
      }
    });

    // CTA buttons
    const ctaText =
      cleanText($('[data-ux="Button"], [data-ux="ButtonPrimary"]').first().text()) ||
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
    // GoDaddy logo
    const logo =
      $('[data-ux="Logo"] img, [data-ux="LogoImage"]').first().attr('src') ||
      $('[class*="Logo"] img').first().attr('src') ||
      null;

    // Hero image - GoDaddy uses background images extensively
    let heroImage: string | null = null;

    // Check for img tags in hero section
    heroImage = $('[data-ux="HeroMedia"] img, [data-ux="HeroImage"]').first().attr('src') || null;

    // Check for background images in style
    if (!heroImage) {
      $('[data-ux="Hero"], [data-ux="HeroMedia"]').each((_, el) => {
        const style = $(el).attr('style') || '';
        const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (match && match[1]) {
          heroImage = match[1];
          return false; // Break
        }
      });
    }

    // All images (GoDaddy uses wsimg.com CDN)
    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.includes('favicon')) {
        const normalized = normalizeUrl(src, url);
        if (!images.includes(normalized)) {
          images.push(normalized);
        }
      }
    });

    // Videos
    const videos: string[] = [];
    $('video source[src], [data-ux="Video"] source').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        videos.push(normalizeUrl(src, url));
      }
    });

    return {
      logo: logo ? normalizeUrl(logo, url) : null,
      favicon: $('link[rel="icon"]').attr('href') || null,
      heroImage: heroImage ? normalizeUrl(heroImage, url) : null,
      images: images.slice(0, 20),
      videos: videos.slice(0, 5),
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

    const mainContent = cleanText(
      $('[data-ux="Page"], main, [role="main"]').text() ||
      $('body').text()
    );

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

export const godaddyExtractor = new GoDaddyExtractor();
