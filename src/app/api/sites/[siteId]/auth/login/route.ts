import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LoginCredentialsSchema } from '@/lib/site-auth/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const body = await request.json();
    const credentials = LoginCredentialsSchema.parse(body);

    const supabase = await createClient();

    // Find user
    const { data: user, error: userError } = await supabase
      .from('site_users')
      .select('*')
      .eq('site_id', params.siteId)
      .eq('email', credentials.email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password
    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.password_hash
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await supabase
      .from('site_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Get user roles
    const { data: userRoles } = await supabase
      .from('site_user_roles')
      .select('site_role_id')
      .eq('site_user_id', user.id);

    const roleIds = userRoles?.map((r) => r.site_role_id) || [];

    let roles: any[] = [];
    if (roleIds.length > 0) {
      const { data: rolesData } = await supabase
        .from('site_roles')
        .select('*')
        .in('id', roleIds);
      roles = rolesData || [];
    }

    // Create session
    const token = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: session, error: sessionError } = await supabase
      .from('site_sessions')
      .insert({
        site_user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        metadata: user.metadata,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
      },
      session: {
        id: session.id,
        token,
        expiresAt: session.expires_at,
      },
      roles,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
