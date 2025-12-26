import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

// GET /api/sites/[siteId]/domains - List all domains
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: domains, error } = await supabase
      .from('site_domains')
      .select('*')
      .eq('site_id', params.siteId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching domains:', error);
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      );
    }

    return NextResponse.json({ domains });
  } catch (error) {
    console.error('Domains error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/domains - Add a new domain
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Normalize domain (lowercase, no protocol, no trailing slash)
    const normalizedDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .trim();

    // Validate domain format
    const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainRegex.test(normalizedDomain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if domain is already in use
    const { data: existing } = await supabase
      .from('site_domains')
      .select('id, site_id')
      .eq('domain', normalizedDomain)
      .single();

    if (existing) {
      if (existing.site_id === params.siteId) {
        return NextResponse.json(
          { error: 'Domain is already added to this site' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Domain is already in use by another site' },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = `verify-${nanoid(32)}`;

    // Check if this is the first domain (make it primary)
    const { count } = await supabase
      .from('site_domains')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', params.siteId);

    const isPrimary = count === 0;

    // Add domain
    const { data: newDomain, error } = await supabase
      .from('site_domains')
      .insert({
        site_id: params.siteId,
        domain: normalizedDomain,
        verification_token: verificationToken,
        is_primary: isPrimary,
        verified: false,
        ssl_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding domain:', error);
      return NextResponse.json(
        { error: 'Failed to add domain' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        domain: newDomain,
        dnsInstructions: getDnsInstructions(normalizedDomain, verificationToken),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Add domain error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// Helper to generate DNS instructions
function getDnsInstructions(domain: string, token: string) {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'yourdomain.com';

  return {
    verification: {
      type: 'TXT',
      name: `_verification.${domain}`,
      value: token,
      description: 'Add this TXT record to verify domain ownership',
    },
    cname: {
      type: 'CNAME',
      name: domain,
      value: appDomain,
      description: 'Add this CNAME record to point your domain to our servers',
    },
    apex: {
      type: 'A',
      name: '@',
      values: ['76.76.21.21'], // Example - would be actual server IPs
      description: 'For apex domains (no www), add A records instead of CNAME',
    },
  };
}

// PATCH /api/sites/[siteId]/domains - Update domain settings (bulk)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const body = await request.json();
    const { primaryDomainId } = body;

    if (!primaryDomainId) {
      return NextResponse.json(
        { error: 'Primary domain ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify domain belongs to site
    const { data: domain } = await supabase
      .from('site_domains')
      .select('id, verified')
      .eq('id', primaryDomainId)
      .eq('site_id', params.siteId)
      .single();

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    if (!domain.verified) {
      return NextResponse.json(
        { error: 'Domain must be verified before setting as primary' },
        { status: 400 }
      );
    }

    // Set as primary (trigger will unset others)
    const { error } = await supabase
      .from('site_domains')
      .update({ is_primary: true })
      .eq('id', primaryDomainId);

    if (error) {
      console.error('Error updating domain:', error);
      return NextResponse.json(
        { error: 'Failed to update domain' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update domains error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
