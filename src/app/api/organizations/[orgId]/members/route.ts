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

// GET /api/organizations/[orgId]/members - List organization members
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
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { data: members, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', params.orgId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[orgId]/members - Invite a new member
export async function POST(
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
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check plan limits
    const { data: billing } = await supabase
      .from('organization_billing')
      .select('plan')
      .eq('organization_id', params.orgId)
      .single();

    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact' })
      .eq('organization_id', params.orgId);

    const planLimits: Record<string, number> = {
      free: 1,
      starter: 3,
      pro: 10,
      agency: 20,
      enterprise: 999,
    };

    const limit = planLimits[billing?.plan || 'free'];

    if ((memberCount || 0) >= limit) {
      return NextResponse.json(
        { error: 'Member limit reached. Please upgrade your plan.' },
        { status: 400 }
      );
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: params.orgId,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      if (inviteError.code === '23505') {
        return NextResponse.json(
          { error: 'User already invited or is a member' },
          { status: 400 }
        );
      }
      console.error('Error creating invitation:', inviteError);
      return NextResponse.json(
        { error: 'Failed to send invitation' },
        { status: 500 }
      );
    }

    // TODO: Send invitation email
    // await sendInvitationEmail(email, invitation.token, organization.name);

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error('Invite member error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// PATCH /api/organizations/[orgId]/members - Update member role
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
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'Member ID and role are required' },
        { status: 400 }
      );
    }

    // Cannot change owner role or your own role
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('organization_id', params.orgId)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      );
    }

    if (targetMember.user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Admin cannot promote to admin
    if (membership.role === 'admin' && role === 'admin') {
      return NextResponse.json(
        { error: 'Only owner can promote to admin' },
        { status: 403 }
      );
    }

    const { data: updatedMember, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      console.error('Error updating member:', error);
      return NextResponse.json(
        { error: 'Failed to update member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE /api/organizations/[orgId]/members - Remove a member
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

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('organization_id', params.orgId)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Users can remove themselves
    if (targetMember.user_id === user.id) {
      if (targetMember.role === 'owner') {
        return NextResponse.json(
          { error: 'Owner cannot leave. Transfer ownership first.' },
          { status: 400 }
        );
      }
    } else {
      // Otherwise need admin/owner permission
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

      if (targetMember.role === 'owner') {
        return NextResponse.json(
          { error: 'Cannot remove owner' },
          { status: 400 }
        );
      }

      // Admin cannot remove admin
      if (membership.role === 'admin' && targetMember.role === 'admin') {
        return NextResponse.json(
          { error: 'Admin cannot remove another admin' },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
