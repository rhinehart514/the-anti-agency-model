import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function verifyMembership(
  supabase: any,
  orgId: string,
  userId: string,
  requiredRoles?: string[]
) {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single();

  if (!membership) return null;
  if (requiredRoles && !requiredRoles.includes(membership.role)) return null;
  return membership;
}

// GET /api/organizations/[orgId] - Get organization details
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const membership = await verifyMembership(supabase, params.orgId, user.id);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_billing (*),
        organization_members (
          id,
          role,
          user_id,
          created_at
        ),
        sites (
          id,
          name,
          slug,
          domain,
          status,
          created_at
        )
      `)
      .eq('id', params.orgId)
      .single();

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization: {
        ...organization,
        role: membership.role,
      },
    });
  } catch (error) {
    console.error('Organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[orgId] - Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const membership = await verifyMembership(
      supabase,
      params.orgId,
      user.id,
      ['owner', 'admin']
    );

    if (!membership) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, logo, settings } = body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name) updateData.name = name;
    if (logo !== undefined) updateData.logo = logo;
    if (settings) updateData.settings = settings;

    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', params.orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization:', error);
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE /api/organizations/[orgId] - Delete organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const membership = await verifyMembership(
      supabase,
      params.orgId,
      user.id,
      ['owner']
    );

    if (!membership) {
      return NextResponse.json(
        { error: 'Forbidden - only owner can delete organization' },
        { status: 403 }
      );
    }

    // Check for active subscriptions
    const { data: billing } = await supabase
      .from('organization_billing')
      .select('status, plan')
      .eq('organization_id', params.orgId)
      .single();

    if (billing?.status === 'active' && billing?.plan !== 'free') {
      return NextResponse.json(
        { error: 'Please cancel your subscription before deleting the organization' },
        { status: 400 }
      );
    }

    // Delete organization (cascades to members, billing, sites)
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', params.orgId);

    if (error) {
      console.error('Error deleting organization:', error);
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Delete organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
