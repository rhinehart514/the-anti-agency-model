import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sanitizeSearchParam } from '@/lib/api-security';
import { loggers } from '@/lib/logger';

// Helper to verify site ownership
async function verifySiteOwnership(
  supabase: any,
  siteId: string
): Promise<{ authorized: boolean; userId?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

// Zod schema for customer
const CustomerCreateSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().max(255).optional(),
  phone: z.string().max(30).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/sites/[siteId]/customers - List customers
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let query = supabase
      .from('customers')
      .select('*, orders(id)', { count: 'exact' })
      .eq('site_id', params.siteId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (search) {
      const safeSearch = sanitizeSearchParam(search);
      query = query.or(`email.ilike.%${safeSearch}%,name.ilike.%${safeSearch}%`);
    }

    const { data: customers, count, error } = await query;

    if (error) {
      loggers.api.error({ error }, 'Error fetching customers');
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Add order count to each customer
    const customersWithStats = customers?.map((customer) => ({
      ...customer,
      orderCount: customer.orders?.length || 0,
      orders: undefined,
    }));

    return NextResponse.json({
      customers: customersWithStats,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Customers error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/customers - Create customer
export async function POST(
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
    const parseResult = CustomerCreateSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const data = parseResult.data;

    // Check for existing customer with same email
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('site_id', params.siteId)
      .eq('email', data.email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 400 }
      );
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        site_id: params.siteId,
        email: data.email.toLowerCase(),
        name: data.name,
        phone: data.phone,
        notes: data.notes,
        tags: data.tags,
        metadata: data.metadata,
      })
      .select()
      .single();

    if (error) {
      loggers.api.error({ error }, 'Error creating customer');
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    loggers.api.error({ error }, 'Create customer error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// PATCH /api/sites/[siteId]/customers - Update customer
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
    const { customerId, ...updates } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;

    const { data: customer, error } = await supabase
      .from('customers')
      .update(dbUpdates)
      .eq('id', customerId)
      .eq('site_id', params.siteId)
      .select()
      .single();

    if (error) {
      loggers.api.error({ error }, 'Error updating customer');
      return NextResponse.json(
        { error: 'Failed to update customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    loggers.api.error({ error }, 'Update customer error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/sites/[siteId]/customers - Delete customer
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
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('site_id', params.siteId);

    if (error) {
      loggers.api.error({ error }, 'Error deleting customer');
      return NextResponse.json(
        { error: 'Failed to delete customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    loggers.api.error({ error }, 'Delete customer error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
