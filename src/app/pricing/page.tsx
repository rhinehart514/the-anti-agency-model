'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PLANS } from '@/lib/stripe/config'
import { redirectToCheckout } from '@/lib/stripe/client'

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (planId: string, priceId: string | null) => {
    if (!priceId) {
      // Free plan - redirect to setup
      window.location.href = '/setup'
      return
    }

    setLoading(planId)
    setError(null)

    try {
      await redirectToCheckout(priceId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <Link href="/" className="text-slate-400 hover:text-white mb-4 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            No hidden fees. No contracts. Start free, upgrade when you need more.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 ${
                plan.id === 'pro'
                  ? 'bg-blue-600 ring-4 ring-blue-400/50'
                  : 'bg-slate-800/50 border border-slate-700'
              }`}
            >
              {plan.id === 'pro' && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-400 text-blue-900 text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
                <p className={`text-sm ${plan.id === 'pro' ? 'text-blue-100' : 'text-slate-400'}`}>
                  {plan.description}
                </p>
              </div>

              <div className="text-center mb-6">
                <span className="text-5xl font-bold text-white">
                  ${plan.price}
                </span>
                {plan.price > 0 && (
                  <span className={`text-lg ${plan.id === 'pro' ? 'text-blue-100' : 'text-slate-400'}`}>
                    /month
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <svg
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        plan.id === 'pro' ? 'text-blue-200' : 'text-green-400'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className={plan.id === 'pro' ? 'text-white' : 'text-slate-300'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id, plan.priceId)}
                disabled={loading !== null}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  plan.id === 'pro'
                    ? 'bg-white text-blue-600 hover:bg-blue-50'
                    : plan.id === 'business'
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                } ${loading === plan.id ? 'opacity-50 cursor-wait' : ''}`}
              >
                {loading === plan.id
                  ? 'Loading...'
                  : plan.price === 0
                  ? 'Get Started Free'
                  : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-400">
                Yes! You can cancel your subscription at any time. Your site will continue
                to work until the end of your billing period, then downgrade to the free plan.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-2">
                What happens to my site if I downgrade?
              </h3>
              <p className="text-slate-400">
                Your sites remain live. If you exceed the free plan limits, you&apos;ll need
                to remove extra sites or upgrade again to make changes.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-slate-400">
                We offer a 14-day money-back guarantee. If you&apos;re not satisfied,
                contact us and we&apos;ll refund your payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
