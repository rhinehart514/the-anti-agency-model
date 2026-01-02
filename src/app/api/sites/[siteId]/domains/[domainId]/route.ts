import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loggers } from '@/lib/logger';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);

// GET /api/sites/[siteId]/domains/[domainId] - Get domain details
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; domainId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: domain, error } = await supabase
      .from('site_domains')
      .select('*')
      .eq('id', params.domainId)
      .eq('site_id', params.siteId)
      .single();

    if (error || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    return NextResponse.json({ domain });
  } catch (error) {
    loggers.api.error({ error }, 'Domain error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/domains/[domainId] - Verify domain
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; domainId: string } }
) {
  try {
    const supabase = await createClient();

    // Get domain
    const { data: domain, error: fetchError } = await supabase
      .from('site_domains')
      .select('*')
      .eq('id', params.domainId)
      .eq('site_id', params.siteId)
      .single();

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    if (domain.verified) {
      return NextResponse.json({
        verified: true,
        message: 'Domain is already verified',
      });
    }

    const verificationResult = await verifyDomain(
      domain.domain,
      domain.verification_token
    );

    // Update domain status
    const updateData: any = {
      last_check_at: new Date().toISOString(),
      dns_configured: verificationResult.dnsConfigured,
    };

    if (verificationResult.verified) {
      updateData.verified = true;
      updateData.ssl_status = 'active'; // In production, would trigger SSL provisioning
    }

    await supabase
      .from('site_domains')
      .update(updateData)
      .eq('id', params.domainId);

    return NextResponse.json({
      verified: verificationResult.verified,
      dnsConfigured: verificationResult.dnsConfigured,
      checks: verificationResult.checks,
      message: verificationResult.verified
        ? 'Domain verified successfully!'
        : 'Verification failed. Please check your DNS settings.',
    });
  } catch (error) {
    loggers.api.error({ error }, 'Verify domain error');
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

// PATCH /api/sites/[siteId]/domains/[domainId] - Update domain
export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string; domainId: string } }
) {
  try {
    const body = await request.json();
    const { isPrimary } = body;

    const supabase = await createClient();

    // Get domain
    const { data: domain, error: fetchError } = await supabase
      .from('site_domains')
      .select('*')
      .eq('id', params.domainId)
      .eq('site_id', params.siteId)
      .single();

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    if (isPrimary !== undefined) {
      if (isPrimary && !domain.verified) {
        return NextResponse.json(
          { error: 'Domain must be verified before setting as primary' },
          { status: 400 }
        );
      }

      await supabase
        .from('site_domains')
        .update({ is_primary: isPrimary })
        .eq('id', params.domainId);
    }

    const { data: updatedDomain } = await supabase
      .from('site_domains')
      .select('*')
      .eq('id', params.domainId)
      .single();

    return NextResponse.json({ domain: updatedDomain });
  } catch (error) {
    loggers.api.error({ error }, 'Update domain error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE /api/sites/[siteId]/domains/[domainId] - Remove domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string; domainId: string } }
) {
  try {
    const supabase = await createClient();

    // Get domain
    const { data: domain, error: fetchError } = await supabase
      .from('site_domains')
      .select('is_primary')
      .eq('id', params.domainId)
      .eq('site_id', params.siteId)
      .single();

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Delete domain
    const { error } = await supabase
      .from('site_domains')
      .delete()
      .eq('id', params.domainId);

    if (error) {
      loggers.api.error({ error }, 'Error deleting domain');
      return NextResponse.json(
        { error: 'Failed to delete domain' },
        { status: 500 }
      );
    }

    // If was primary, set another domain as primary
    if (domain.is_primary) {
      const { data: otherDomains } = await supabase
        .from('site_domains')
        .select('id')
        .eq('site_id', params.siteId)
        .eq('verified', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (otherDomains && otherDomains.length > 0) {
        await supabase
          .from('site_domains')
          .update({ is_primary: true })
          .eq('id', otherDomains[0].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    loggers.api.error({ error }, 'Delete domain error');
    return NextResponse.json(
      { error: 'Failed to delete domain' },
      { status: 500 }
    );
  }
}

// Helper to verify domain DNS
async function verifyDomain(
  domain: string,
  verificationToken: string
): Promise<{
  verified: boolean;
  dnsConfigured: boolean;
  checks: {
    txt: { found: boolean; value?: string };
    cname: { found: boolean; value?: string };
    a: { found: boolean; values?: string[] };
  };
}> {
  const checks = {
    txt: { found: false, value: undefined as string | undefined },
    cname: { found: false, value: undefined as string | undefined },
    a: { found: false, values: undefined as string[] | undefined },
  };

  // Check TXT record for verification
  try {
    const txtRecords = await resolveTxt(`_verification.${domain}`);
    const flatRecords = txtRecords.flat();

    if (flatRecords.includes(verificationToken)) {
      checks.txt.found = true;
      checks.txt.value = verificationToken;
    }
  } catch (err) {
    // TXT record not found
  }

  // Check CNAME record
  try {
    const cnameRecords = await resolveCname(domain);
    if (cnameRecords.length > 0) {
      checks.cname.found = true;
      checks.cname.value = cnameRecords[0];
    }
  } catch (err) {
    // CNAME not found, might be apex domain
  }

  // Check A record (for apex domains)
  try {
    const aRecords = await resolve4(domain);
    if (aRecords.length > 0) {
      checks.a.found = true;
      checks.a.values = aRecords;
    }
  } catch (err) {
    // A records not found
  }

  const verified = checks.txt.found;
  const dnsConfigured = checks.cname.found || checks.a.found;

  return {
    verified,
    dnsConfigured,
    checks,
  };
}
