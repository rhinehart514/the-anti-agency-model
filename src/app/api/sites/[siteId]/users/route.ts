import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRateLimit, rateLimiters } from '@/lib/rate-limit';
import { sendInvitationEmail } from '@/lib/email/send';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { sanitizeSearchParam } from '@/lib/api-security';
import { loggers } from '@/lib/logger';

// Zod schema for user invitation
const UserInviteSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().max(255).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  sendInvite: z.boolean().default(true),
});

// Zod schema for user update
const UserUpdateSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().max(255).optional(),
  status: z.enum(['active', 'pending', 'suspended', 'inactive']).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Helper to verify site ownership
async function verifySiteOwnership(supabase: any, siteId: string): Promise<{ authorized: boolean; userId?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false };
  }

  const { data: site } = await supabase
    .from('sites')
    .select('user_id')
    .eq('id', siteId)
    .single();

  if (!site || site.user_id !== user.id) {
    return { authorized: false };
  }

  return { authorized: true, userId: user.id };
}

// GET /api/sites/[siteId]/users - List all site users
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication and site ownership
    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
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
      const safeSearch = sanitizeSearchParam(search);
      query = query.or(`email.ilike.%${safeSearch}%,name.ilike.%${safeSearch}%`);
    }

    const { data: users, count, error } = await query;

    if (error) {
      loggers.api.error({ error }, 'Error fetching users');
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
    loggers.api.error({ error }, 'Users error');
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
    const supabase = await createClient();

    // Verify authentication and site ownership
    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = UserInviteSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const { email, name, roleIds, sendInvite } = parseResult.data;

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
      loggers.api.error({ error: userError }, 'Error creating user');
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

    // Send invitation email if sendInvite is true
    if (sendInvite) {
      // Get site info for the email
      const { data: site } = await supabase
        .from('sites')
        .select('name, slug')
        .eq('id', params.siteId)
        .single();

      // Generate invitation token
      const inviteToken = randomBytes(32).toString('hex');

      // Store token (you could also add an invitations table)
      await supabase
        .from('site_users')
        .update({
          metadata: {
            ...user.metadata,
            invite_token: inviteToken,
            invite_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }
        })
        .eq('id', user.id);

      // Build invite URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const inviteUrl = `${appUrl}/sites/${site?.slug || params.siteId}/accept-invite?token=${inviteToken}`;

      // Send the email
      try {
        await sendInvitationEmail(email.toLowerCase(), {
          inviteeName: name,
          siteName: site?.name || 'our platform',
          inviteUrl,
          expiresIn: '7 days',
        });
      } catch (emailError) {
        loggers.api.error({ error: emailError }, 'Failed to send invitation email');
        // Continue - user was created, email just failed
      }
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
    loggers.api.error({ error }, 'Create user error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// PATCH /api/sites/[siteId]/users - Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = UserUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const { userId, name, status, roleIds, metadata } = parseResult.data;

    // Verify user belongs to this site
    const { data: existingUser } = await supabase
      .from('site_users')
      .select('id')
      .eq('id', userId)
      .eq('site_id', params.siteId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build update object
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) dbUpdates.name = name;
    if (status !== undefined) dbUpdates.status = status;
    if (metadata !== undefined) dbUpdates.metadata = metadata;

    const { error: updateError } = await supabase
      .from('site_users')
      .update(dbUpdates)
      .eq('id', userId)
      .eq('site_id', params.siteId);

    if (updateError) {
      loggers.api.error({ error: updateError }, 'Error updating user');
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Update roles if provided
    if (roleIds !== undefined) {
      // Remove existing roles
      await supabase
        .from('site_user_roles')
        .delete()
        .eq('site_user_id', userId);

      // Add new roles
      if (roleIds.length > 0) {
        const roleAssignments = roleIds.map((roleId) => ({
          site_user_id: userId,
          site_role_id: roleId,
        }));
        await supabase.from('site_user_roles').insert(roleAssignments);
      }
    }

    // Fetch updated user
    const { data: updatedUser } = await supabase
      .from('site_users')
      .select(`
        *,
        site_user_roles (
          site_roles (id, name)
        )
      `)
      .eq('id', userId)
      .single();

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    loggers.api.error({ error }, 'Update user error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/sites/[siteId]/users - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify user belongs to this site
    const { data: existingUser } = await supabase
      .from('site_users')
      .select('id')
      .eq('id', userId)
      .eq('site_id', params.siteId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user roles first (cascade might handle this, but be explicit)
    await supabase
      .from('site_user_roles')
      .delete()
      .eq('site_user_id', userId);

    // Delete user sessions
    await supabase
      .from('site_sessions')
      .delete()
      .eq('site_user_id', userId);

    // Delete the user
    const { error } = await supabase
      .from('site_users')
      .delete()
      .eq('id', userId)
      .eq('site_id', params.siteId);

    if (error) {
      loggers.api.error({ error }, 'Error deleting user');
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    loggers.api.error({ error }, 'Delete user error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
