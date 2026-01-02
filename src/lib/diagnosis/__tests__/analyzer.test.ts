import { describe, it, expect } from 'vitest';
import { analyzeSite } from '../analyzer';

describe('Site Analyzer', () => {
  describe('analyzeSite', () => {
    it('returns a complete diagnosis result', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Test Site | Home</title>
          <meta name="description" content="A test site for diagnosis.">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta property="og:title" content="Test Site">
          <link rel="canonical" href="https://example.com/">
        </head>
        <body>
          <h1>Welcome to Test Site</h1>
          <p>Some content here.</p>
          <img src="/image.jpg" alt="Test image">
          <form>
            <label for="email">Email</label>
            <input type="email" id="email" name="email">
            <button type="submit">Subscribe</button>
          </form>
        </body>
        </html>
      `;

      const result = await analyzeSite('https://example.com/', html);

      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com/');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.overallGrade).toMatch(/^[A-F]$/);
      expect(result.categories).toBeDefined();
      expect(result.categories.seo).toBeDefined();
      expect(result.categories.mobile).toBeDefined();
      expect(result.categories.accessibility).toBeDefined();
      expect(result.categories.conversion).toBeDefined();
      expect(result.categories.security).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.opportunities)).toBe(true);
    });

    it('identifies missing viewport as a mobile issue', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>No Viewport Site</title>
        </head>
        <body>
          <h1>Content</h1>
        </body>
        </html>
      `;

      const result = await analyzeSite('https://example.com/', html);

      expect(result.categories.mobile.score).toBeLessThan(100);
      expect(result.issues.some(i => i.id.includes('mobile'))).toBe(true);
    });

    it('identifies missing meta description as SEO issue', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Missing Description Site</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h1>Content</h1>
        </body>
        </html>
      `;

      const result = await analyzeSite('https://example.com/', html);

      expect(result.categories.seo.score).toBeLessThan(100);
      expect(result.issues.some(i => i.category === 'seo')).toBe(true);
    });

    it('identifies missing lang attribute as accessibility issue', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>No Lang Site</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="Test site">
        </head>
        <body>
          <h1>Content</h1>
        </body>
        </html>
      `;

      const result = await analyzeSite('https://example.com/', html);

      expect(result.categories.accessibility.score).toBeLessThan(100);
      expect(result.issues.some(i => i.category === 'accessibility')).toBe(true);
    });

    it('identifies missing CTAs as conversion issue', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>No CTA Site</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="Test site">
        </head>
        <body>
          <h1>Welcome</h1>
          <p>Just some text, no buttons or forms.</p>
        </body>
        </html>
      `;

      const result = await analyzeSite('https://example.com/', html);

      expect(result.categories.conversion.score).toBeLessThan(100);
      expect(result.issues.some(i => i.category === 'conversion')).toBe(true);
    });

    it('identifies HTTP as security issue', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>HTTP Site</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="Test site">
        </head>
        <body>
          <h1>Content</h1>
        </body>
        </html>
      `;

      const result = await analyzeSite('http://example.com/', html);

      expect(result.categories.security.score).toBeLessThan(100);
      expect(result.issues.some(i => i.category === 'security')).toBe(true);
    });

    it('calculates correct overall grade based on score', async () => {
      // Test with a well-structured page
      const goodHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Well Structured Site</title>
          <meta name="description" content="A well-structured site with all the right elements.">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta property="og:title" content="Well Structured Site">
          <meta property="og:description" content="A well-structured site">
          <meta property="og:image" content="/og-image.jpg">
          <link rel="canonical" href="https://example.com/">
        </head>
        <body>
          <header>
            <nav aria-label="Main navigation">
              <a href="/">Home</a>
              <a href="/about">About</a>
            </nav>
          </header>
          <main>
            <h1>Welcome to Our Site</h1>
            <p>We offer great services for your business.</p>
            <img src="/hero.jpg" alt="Hero image showing our team">
            <form action="/contact" method="post">
              <label for="email">Your Email</label>
              <input type="email" id="email" name="email" required>
              <button type="submit" class="cta">Get Started</button>
            </form>
          </main>
          <footer>
            <p>&copy; 2024 Example Company</p>
          </footer>
        </body>
        </html>
      `;

      const result = await analyzeSite('https://example.com/', goodHtml);

      expect(result.overallScore).toBeGreaterThan(50);
      expect(['A', 'B', 'C']).toContain(result.overallGrade);
    });

    it('can skip specific categories', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Test Site</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h1>Content</h1>
        </body>
        </html>
      `;

      const resultWithSEO = await analyzeSite('https://example.com/', html);
      const resultWithoutSEO = await analyzeSite('https://example.com/', html, {
        skipCategories: ['seo'],
      });

      // With SEO check, score should be less than 100 due to missing meta description
      expect(resultWithSEO.categories.seo.score).toBeLessThan(100);
      // When SEO is skipped, the category shows as score 0 (skipped)
      expect(resultWithoutSEO.categories.seo.score).toBe(0);
      expect(resultWithoutSEO.categories.seo.summary).toBe('Check was skipped');
    });
  });
});
