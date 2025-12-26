import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/organizations - List user's organizations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get organizations where user is a member
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organizations (
          *,
          organization_billing (*),
          sites (id)
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    const organizations = memberships?.map((m: any) => ({
      ...m.organizations,
      role: m.role,
      siteCount: m.organizations.sites?.length || 0,
      sites: undefined,
    })) || [];

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Organizations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
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
    const { name, slug, logo, settings } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug is already taken
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Organization slug is already taken' },
        { status: 400 }
      );
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        logo,
        settings: settings || {},
        owner_id: user.id,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Add creator as owner
    await supabase.from('organization_members').insert({
      organization_id: organization.id,
      user_id: user.id,
      role: 'owner',
    });

    // Create billing record with free plan
    await supabase.from('organization_billing').insert({
      organization_id: organization.id,
      plan: 'free',
      status: 'active',
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
