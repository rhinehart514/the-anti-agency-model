import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Lazy initialization of admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return null
  }

  return createClient(url, key)
}

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Billing is not configured' },
      { status: 503 }
    )
  }

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(supabaseAdmin, session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(supabaseAdmin, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(supabaseAdmin, subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(supabaseAdmin, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = any

async function handleCheckoutComplete(supabaseAdmin: SupabaseAdmin, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const planId = session.metadata?.plan_id
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId || !planId) {
    console.error('Missing metadata in checkout session')
    return
  }

  await supabaseAdmin.from('user_profiles').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_id: planId,
    subscription_status: 'active',
    updated_at: new Date().toISOString(),
  })

  console.log(`User ${userId} subscribed to ${planId}`)
}

async function handleSubscriptionUpdate(supabaseAdmin: SupabaseAdmin, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('No user found for customer:', customerId)
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  let planId = 'free'

  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    planId = 'pro'
  } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
    planId = 'business'
  }

  await supabaseAdmin.from('user_profiles').update({
    plan_id: planId,
    subscription_status: subscription.status,
    updated_at: new Date().toISOString(),
  }).eq('user_id', profile.user_id)

  console.log(`Subscription updated for user ${profile.user_id}: ${subscription.status}`)
}

async function handleSubscriptionCanceled(supabaseAdmin: SupabaseAdmin, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('No user found for customer:', customerId)
    return
  }

  await supabaseAdmin.from('user_profiles').update({
    plan_id: 'free',
    subscription_status: 'canceled',
    stripe_subscription_id: null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', profile.user_id)

  console.log(`Subscription canceled for user ${profile.user_id}`)
}

async function handlePaymentFailed(supabaseAdmin: SupabaseAdmin, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    return
  }

  await supabaseAdmin.from('user_profiles').update({
    subscription_status: 'past_due',
    updated_at: new Date().toISOString(),
  }).eq('user_id', profile.user_id)

  console.log(`Payment failed for user ${profile.user_id}`)
}
