const { withSentryConfig } = require('@sentry/nextjs');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // CSP for API routes (less restrictive)
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; frame-ancestors 'none';",
          },
        ],
      },
    ]
  },

  // Disable x-powered-by header
  poweredByHeader: false,
}

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Organization and project slugs from Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silently fail if auth token is missing (useful for local development)
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from production builds
  hideSourceMaps: true,

  // Disable the widget that prompts for feedback
  disableLogger: true,
};

// Only wrap with Sentry in production or when explicitly enabled
const withPlugins = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? (config) => withSentryConfig(withBundleAnalyzer(config), sentryWebpackPluginOptions)
  : withBundleAnalyzer;

module.exports = withPlugins(nextConfig)
