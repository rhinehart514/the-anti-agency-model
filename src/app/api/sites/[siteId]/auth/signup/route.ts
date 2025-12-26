import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SignupCredentialsSchema } from '@/lib/site-auth/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const body = await request.json();
    const credentials = SignupCredentialsSchema.parse(body);

    const supabase = await createClient();

    // Check if site exists
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id')
      .eq('id', params.siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('site_users')
      .select('id')
      .eq('site_id', params.siteId)
      .eq('email', credentials.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(credentials.password, 12);

    // Create user
    const { data: user, error: userError } = await supabase
      .from('site_users')
      .insert({
        site_id: params.siteId,
        email: credentials.email,
        password_hash: passwordHash,
        name: credentials.name,
        metadata: credentials.metadata || {},
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

    // Get default role
    const { data: defaultRole } = await supabase
      .from('site_roles')
      .select('*')
      .eq('site_id', params.siteId)
      .eq('is_default', true)
      .single();

    // Assign default role if exists
    if (defaultRole) {
      await supabase
        .from('site_user_roles')
        .insert({
          site_user_id: user.id,
          site_role_id: defaultRole.id,
        });
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

    // Return user and session
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        metadata: user.metadata,
        createdAt: user.created_at,
      },
      session: {
        id: session.id,
        token,
        expiresAt: session.expires_at,
      },
      roles: defaultRole ? [defaultRole] : [],
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
