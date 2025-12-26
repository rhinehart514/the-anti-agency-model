import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/sites/[siteId]/users - List all site users
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('site_users')
      .select(`
        *,
        site_user_roles (
          site_roles (id, name)
        )
      `, { count: 'exact' })
      .eq('site_id', params.siteId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/users - Invite a user
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const body = await request.json();
    const { email, name, roleIds, sendInvite = true } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user already exists
    const { data: existing } = await supabase
      .from('site_users')
      .select('id')
      .eq('site_id', params.siteId)
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create user with pending status
    const { data: user, error: userError } = await supabase
      .from('site_users')
      .insert({
        site_id: params.siteId,
        email: email.toLowerCase(),
        name,
        status: 'pending',
        email_verified: false,
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Assign roles if provided
    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
      const roleAssignments = roleIds.map((roleId: string) => ({
        site_user_id: user.id,
        site_role_id: roleId,
      }));

      await supabase.from('site_user_roles').insert(roleAssignments);
    }

    // TODO: Send invitation email if sendInvite is true
    if (sendInvite) {
      // await sendInvitationEmail(email, site, user);
    }

    // Fetch complete user
    const { data: completeUser } = await supabase
      .from('site_users')
      .select(`
        *,
        site_user_roles (
          site_roles (id, name)
        )
      `)
      .eq('id', user.id)
      .single();

    return NextResponse.json({ user: completeUser }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
