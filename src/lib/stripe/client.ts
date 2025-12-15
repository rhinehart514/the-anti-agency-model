'use client'

import { loadStripe } from '@stripe/stripe-js'

let stripePromise: ReturnType<typeof loadStripe> | null = null

export function getStripe() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set')
      return null
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

export async function redirectToCheckout(priceId: string): Promise<void> {
  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error)
  }

  if (!data.url) {
    throw new Error('No checkout URL returned')
  }

  // Redirect to Stripe Checkout
  window.location.href = data.url
}

export async function redirectToPortal(): Promise<void> {
  const response = await fetch('/api/billing/portal', {
    method: 'POST',
  })

  const { url, error } = await response.json()

  if (error) {
    throw new Error(error)
  }

  window.location.href = url
}
