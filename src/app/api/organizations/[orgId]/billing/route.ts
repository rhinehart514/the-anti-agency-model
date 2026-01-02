import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  stripe,
  getOrCreateCustomer,
  createSubscription,
  cancelSubscription,
  getSubscription
} from '@/lib/stripe/client';
import { loggers } from '@/lib/logger';

// Pricing configuration
const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
  agency: process.env.STRIPE_AGENCY_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

// GET /api/organizations/[orgId]/billing - Get billing info
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: billing, error } = await supabase
      .from('organization_billing')
      .select('*')
      .eq('organization_id', params.orgId)
      .single();

    if (error && error.code !== 'PGRST116') {
      loggers.api.error({ error }, 'Error fetching billing');
      return NextResponse.json(
        { error: 'Failed to fetch billing information' },
        { status: 500 }
      );
    }

    // If no billing record exists, return free plan defaults
    if (!billing) {
      return NextResponse.json({
        billing: {
          plan: 'free',
          status: 'active',
          site_limit: 1,
          page_limit: 5,
          storage_limit: 100, // MB
        },
      });
    }

    // Fetch subscription details from Stripe if available
    let subscription = null;
    if (billing.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        subscription = await getSubscription(billing.stripe_subscription_id);
      } catch (e) {
        loggers.api.error({ error: e }, 'Error fetching Stripe subscription');
      }
    }

    return NextResponse.json({
      billing: {
        ...billing,
        subscription,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Billing error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[orgId]/billing/subscribe - Create subscription
export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const body = await request.json();
    const { plan, successUrl, cancelUrl } = body;

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*, organization_members(users(email))')
      .eq('id', params.orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get primary owner email
    const ownerEmail = org.organization_members?.[0]?.users?.email;
    if (!ownerEmail) {
      return NextResponse.json(
        { error: 'Organization owner email not found' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(ownerEmail, {
      organization_id: params.orgId,
      organization_name: org.name,
    });

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?canceled=true`,
      subscription_data: {
        metadata: {
          organization_id: params.orgId,
        },
      },
      metadata: {
        organization_id: params.orgId,
        plan,
      },
    });

    // Update or create billing record
    await supabase
      .from('organization_billing')
      .upsert({
        organization_id: params.orgId,
        stripe_customer_id: customer.id,
        plan: 'free', // Will be updated by webhook on successful payment
        status: 'pending',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
      });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    loggers.api.error({ error }, 'Subscription error');
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[orgId]/billing - Update subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const body = await request.json();
    const { action, newPlan } = body;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const { data: billing, error } = await supabase
      .from('organization_billing')
      .select('*')
      .eq('organization_id', params.orgId)
      .single();

    if (error || !billing?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    if (action === 'cancel') {
      // Cancel at end of period
      const subscription = await cancelSubscription(
        billing.stripe_subscription_id,
        false // Cancel at period end, not immediately
      );

      await supabase
        .from('organization_billing')
        .update({
          status: 'canceling',
          cancel_at: new Date(subscription.cancel_at! * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', params.orgId);

      return NextResponse.json({
        message: 'Subscription will be canceled at the end of the billing period',
        cancelAt: subscription.cancel_at,
      });
    }

    if (action === 'cancel_immediately') {
      await cancelSubscription(billing.stripe_subscription_id, true);

      await supabase
        .from('organization_billing')
        .update({
          status: 'cancelled',
          plan: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', params.orgId);

      return NextResponse.json({
        message: 'Subscription canceled immediately',
      });
    }

    if (action === 'reactivate') {
      // Remove cancel at period end
      await stripe.subscriptions.update(billing.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      await supabase
        .from('organization_billing')
        .update({
          status: 'active',
          cancel_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', params.orgId);

      return NextResponse.json({
        message: 'Subscription reactivated',
      });
    }

    if (action === 'change_plan' && newPlan) {
      if (!PRICE_IDS[newPlan]) {
        return NextResponse.json(
          { error: 'Invalid plan' },
          { status: 400 }
        );
      }

      const subscription = await getSubscription(billing.stripe_subscription_id);

      await stripe.subscriptions.update(billing.stripe_subscription_id, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: PRICE_IDS[newPlan],
          },
        ],
        proration_behavior: 'create_prorations',
      });

      await supabase
        .from('organization_billing')
        .update({
          plan: newPlan,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', params.orgId);

      return NextResponse.json({
        message: `Plan changed to ${newPlan}`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    loggers.api.error({ error }, 'Billing update error');
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
