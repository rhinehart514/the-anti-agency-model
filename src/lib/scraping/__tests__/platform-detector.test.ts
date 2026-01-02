import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { detectPlatform, getPlatformInfo } from '../platform-detector';

describe('Platform Detector', () => {
  describe('detectPlatform', () => {
    it('detects Squarespace sites', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="generator" content="Squarespace">
          <script src="https://static.squarespace.com/static/script.js"></script>
        </head>
        <body class="sqs-block">
          <div data-squarespace="true">Content</div>
        </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const result = detectPlatform($, html);

      expect(result.platform).toBe('squarespace');
      expect(result.confidence).toBe('high');
      expect(result.indicators.length).toBeGreaterThan(0);
    });

    it('detects Wix sites', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="generator" content="Wix.com Website Builder">
          <script src="https://static.wixstatic.com/script.js"></script>
        </head>
        <body>
          <div data-testid="wix-element">Content</div>
        </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const result = detectPlatform($, html);

      expect(result.platform).toBe('wix');
      expect(result.confidence).toBe('high');
    });

    it('detects WordPress sites', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="generator" content="WordPress 6.4.2">
          <link rel="stylesheet" href="/wp-content/themes/theme/style.css">
        </head>
        <body class="wp-page">
          <script src="/wp-includes/js/script.js"></script>
        </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const result = detectPlatform($, html);

      expect(result.platform).toBe('wordpress');
      expect(result.confidence).toBe('high');
    });

    it('detects Shopify sites', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="shopify-checkout-api-token" content="token123">
          <script src="https://cdn.shopify.com/script.js"></script>
        </head>
        <body>
          <div class="shopify-section">Content</div>
        </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const result = detectPlatform($, html);

      expect(result.platform).toBe('shopify');
      expect(result.confidence).toBe('high');
    });

    it('detects GoDaddy Website Builder sites', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="generator" content="GoDaddy Website Builder">
          <script src="https://wsimg.com/script.js"></script>
        </head>
        <body>
          <div data-ux="Header">Content</div>
        </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const result = detectPlatform($, html);

      expect(result.platform).toBe('godaddy');
      expect(result.confidence).toBe('high');
    });

    it('detects Webflow sites', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="generator" content="Webflow">
          <script src="https://uploads-ssl.webflow.com/script.js"></script>
        </head>
        <body>
          <div class="w-nav" data-wf-site="site123">Content</div>
        </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const result = detectPlatform($, html);

      expect(result.platform).toBe('webflow');
      expect(result.confidence).toBe('high');
    });

    it('returns unknown for unrecognized platforms', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Custom Site</title>
        </head>
        <body>
          <p>Just a simple HTML page</p>
        </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const result = detectPlatform($, html);

      expect(result.platform).toBe('unknown');
      expect(result.confidence).toBe('low');
    });

    it('uses headers for detection when provided', () => {
      const html = `<!DOCTYPE html><html><body>Simple page</body></html>`;
      const $ = cheerio.load(html);
      const headers = {
        'x-powered-by': 'Express',
      };

      const result = detectPlatform($, html, headers);
      expect(result.platform).toBe('unknown');
    });
  });

  describe('getPlatformInfo', () => {
    it('returns correct info for Squarespace', () => {
      const info = getPlatformInfo('squarespace');

      expect(info.name).toBe('Squarespace');
      expect(info.requiresJavaScript).toBe(false);
    });

    it('returns correct info for Wix (requires JS)', () => {
      const info = getPlatformInfo('wix');

      expect(info.name).toBe('Wix');
      expect(info.requiresJavaScript).toBe(true);
    });

    it('returns correct info for WordPress', () => {
      const info = getPlatformInfo('wordpress');

      expect(info.name).toBe('WordPress');
      expect(info.requiresJavaScript).toBe(false);
    });

    it('returns correct info for unknown platform', () => {
      const info = getPlatformInfo('unknown');

      expect(info.name).toBe('Unknown Platform');
      expect(info.requiresJavaScript).toBe(false);
    });
  });
});
