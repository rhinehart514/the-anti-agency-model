import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDnsInstructions, verifyDomain, generateVerificationCode } from '@/lib/domains/config'

// Get domain settings for a site
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const siteSlug = searchParams.get('siteSlug')

  if (!siteSlug) {
    return NextResponse.json({ error: 'Site slug required' }, { status: 400 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get site and verify ownership
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, slug, custom_domain, custom_domain_verified, owner_id')
    .eq('slug', siteSlug)
    .single()

  if (siteError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  if (site.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const dnsInstructions = site.custom_domain
    ? getDnsInstructions(site.custom_domain, site.slug)
    : null

  return NextResponse.json({
    domain: site.custom_domain,
    verified: site.custom_domain_verified,
    dnsInstructions,
  })
}

// Set custom domain for a site
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { siteSlug, domain } = await request.json()

    if (!siteSlug) {
      return NextResponse.json({ error: 'Site slug required' }, { status: 400 })
    }

    // Get site and verify ownership
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, slug, owner_id')
      .eq('slug', siteSlug)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    if (site.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check user's plan allows custom domains
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.plan_id === 'free') {
      return NextResponse.json(
        { error: 'Custom domains require a Pro or Business plan' },
        { status: 403 }
      )
    }

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
    if (domain && !domainRegex.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
    }

    // Check if domain is already in use
    if (domain) {
      const { data: existingSite } = await supabase
        .from('sites')
        .select('id')
        .eq('custom_domain', domain)
        .neq('id', site.id)
        .single()

      if (existingSite) {
        return NextResponse.json(
          { error: 'This domain is already in use' },
          { status: 409 }
        )
      }
    }

    // Update site with new domain
    const { error: updateError } = await supabase
      .from('sites')
      .update({
        custom_domain: domain || null,
        custom_domain_verified: false,
      })
      .eq('id', site.id)

    if (updateError) {
      throw updateError
    }

    const dnsInstructions = domain ? getDnsInstructions(domain, site.slug) : null

    return NextResponse.json({
      success: true,
      domain,
      verified: false,
      dnsInstructions,
    })
  } catch (error) {
    console.error('Domain update error:', error)
    return NextResponse.json(
      { error: 'Failed to update domain' },
      { status: 500 }
    )
  }
}

// Verify domain DNS configuration
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { siteSlug } = await request.json()

    if (!siteSlug) {
      return NextResponse.json({ error: 'Site slug required' }, { status: 400 })
    }

    // Get site and verify ownership
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, slug, custom_domain, owner_id')
      .eq('slug', siteSlug)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    if (site.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (!site.custom_domain) {
      return NextResponse.json({ error: 'No domain configured' }, { status: 400 })
    }

    // Verify domain
    const expectedTxtValue = generateVerificationCode(site.slug)
    const verified = await verifyDomain(site.custom_domain, expectedTxtValue)

    // Update verification status
    await supabase
      .from('sites')
      .update({ custom_domain_verified: verified })
      .eq('id', site.id)

    return NextResponse.json({
      verified,
      message: verified
        ? 'Domain verified successfully!'
        : 'Domain verification failed. Please check your DNS settings.',
    })
  } catch (error) {
    console.error('Domain verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 }
    )
  }
}
