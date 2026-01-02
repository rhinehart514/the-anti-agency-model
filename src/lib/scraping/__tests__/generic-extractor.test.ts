import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { genericExtractor } from '../extractors/generic';

describe('Generic Extractor', () => {
  it('extracts business name from meta tags', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:site_name" content="Acme Corp">
        <title>Acme Corp | Home</title>
      </head>
      <body></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.business.name).toBe('Acme Corp');
  });

  it('extracts business name from title when og:site_name is missing', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>My Business - Home Page</title>
      </head>
      <body></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.business.name).toBe('My Business');
  });

  it('extracts contact information', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body>
        <footer>
          <a href="tel:+15551234567">(555) 123-4567</a>
          <a href="mailto:info@example.com">info@example.com</a>
        </footer>
      </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.business.phone).toContain('555');
    expect(result.business.email).toBe('info@example.com');
  });

  it('extracts hero content', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body>
        <div class="hero">
          <h1>Welcome to Our Amazing Service</h1>
          <p>We help businesses grow with innovative solutions.</p>
        </div>
      </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.content.heroText).toBe('Welcome to Our Amazing Service');
    expect(result.content.heroSubtext).toBe('We help businesses grow with innovative solutions.');
  });

  it('extracts services list', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body>
        <section class="services">
          <ul>
            <li>Web Design</li>
            <li>SEO Optimization</li>
            <li>Content Marketing</li>
          </ul>
        </section>
      </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.content.services).toContain('Web Design');
    expect(result.content.services).toContain('SEO Optimization');
    expect(result.content.services).toContain('Content Marketing');
  });

  it('extracts testimonials', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body>
        <div class="testimonial">
          <p class="text">Great service! Highly recommend.</p>
          <span class="author">John Smith</span>
        </div>
      </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.content.testimonials.length).toBeGreaterThan(0);
    expect(result.content.testimonials[0].text).toContain('Great service');
    expect(result.content.testimonials[0].author).toBe('John Smith');
  });

  it('extracts logo URL', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body>
        <header>
          <div class="logo">
            <img src="/images/logo.png" alt="Company Logo">
          </div>
        </header>
      </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.assets.logo).toContain('logo.png');
  });

  it('extracts images with normalized URLs', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body>
        <img src="/images/hero.jpg" alt="Hero">
        <img src="https://cdn.example.com/photo.png" alt="Photo">
      </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.assets.images).toContain('https://example.com/images/hero.jpg');
    expect(result.assets.images).toContain('https://cdn.example.com/photo.png');
  });

  it('extracts SEO metadata', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Acme Corp | Professional Services</title>
        <meta name="description" content="Leading provider of professional services">
        <meta name="keywords" content="services, professional, acme">
        <meta property="og:image" content="https://example.com/og.jpg">
        <link rel="canonical" href="https://example.com/">
      </head>
      <body></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.seo.title).toBe('Acme Corp | Professional Services');
    expect(result.seo.description).toBe('Leading provider of professional services');
    expect(result.seo.keywords).toContain('services');
    expect(result.seo.ogImage).toBe('https://example.com/og.jpg');
    expect(result.seo.canonicalUrl).toBe('https://example.com/');
  });

  it('extracts social links', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body>
        <footer>
          <a href="https://facebook.com/company">Facebook</a>
          <a href="https://twitter.com/company">Twitter</a>
          <a href="https://linkedin.com/company/test">LinkedIn</a>
          <a href="https://instagram.com/company">Instagram</a>
        </footer>
      </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.social.facebook).toContain('facebook.com');
    expect(result.social.twitter).toContain('twitter.com');
    expect(result.social.linkedin).toContain('linkedin.com');
    expect(result.social.instagram).toContain('instagram.com');
  });

  it('extracts internal links', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/services">Services</a>
          <a href="/contact">Contact</a>
        </nav>
      </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = await genericExtractor.extract($, 'https://example.com/', html);

    expect(result.pages[0].links).toContain('/');
    expect(result.pages[0].links).toContain('/about');
    expect(result.pages[0].links).toContain('/services');
    expect(result.pages[0].links).toContain('/contact');
  });

  it('determines page type correctly', async () => {
    const homeHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body><h1>Welcome Home</h1></body>
      </html>
    `;
    const $ = cheerio.load(homeHtml);
    const result = await genericExtractor.extract($, 'https://example.com/', homeHtml);

    expect(result.pages[0].type).toBe('home');

    const aboutHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>About Us</title></head>
      <body><h1>About Our Company</h1></body>
      </html>
    `;
    const $about = cheerio.load(aboutHtml);
    const aboutResult = await genericExtractor.extract($about, 'https://example.com/about', aboutHtml);

    expect(aboutResult.pages[0].type).toBe('about');
  });
});
