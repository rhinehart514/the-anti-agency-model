import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set - billing features will be disabled')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    })
  : null

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

// Pricing Plans
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with one site',
    price: 0,
    priceId: null,
    features: [
      '1 website',
      'Anti-Agency subdomain',
      'Basic templates',
      'Contact form',
      'AI content suggestions (limited)',
    ],
    limits: {
      sites: 1,
      pagesPerSite: 3,
      aiRequestsPerMonth: 20,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Everything you need to grow',
    price: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    features: [
      '3 websites',
      'Custom domain',
      'Remove Anti-Agency branding',
      'Priority support',
      'AI content suggestions (unlimited)',
      'Analytics dashboard',
    ],
    limits: {
      sites: 3,
      pagesPerSite: 10,
      aiRequestsPerMonth: -1, // unlimited
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For teams and agencies',
    price: 49,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || null,
    features: [
      'Unlimited websites',
      'Custom domains',
      'White-label option',
      'Team collaboration',
      'Priority support',
      'AI content suggestions (unlimited)',
      'Advanced analytics',
      'API access',
    ],
    limits: {
      sites: -1, // unlimited
      pagesPerSite: -1, // unlimited
      aiRequestsPerMonth: -1, // unlimited
    },
  },
} as const

export type PlanId = keyof typeof PLANS
export type Plan = (typeof PLANS)[PlanId]

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] || PLANS.free
}
