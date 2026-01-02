import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
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

// Zod schema for shipping method
const ShippingMethodSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  price: z.number().min(0),
  minOrderValue: z.number().min(0).optional(),
  maxOrderValue: z.number().min(0).optional(),
  estimatedDays: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
  countries: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
});

// GET /api/sites/[siteId]/shipping-methods - List shipping methods
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
    const active = searchParams.get('active');

    let query = supabase
      .from('shipping_methods')
      .select('*')
      .eq('site_id', params.siteId)
      .order('price', { ascending: true });

    if (active === 'true') {
      query = query.eq('is_active', true);
    }

    const { data: methods, error } = await query;

    if (error) {
      loggers.api.error({ error }, 'Error fetching shipping methods');
      return NextResponse.json(
        { error: 'Failed to fetch shipping methods' },
        { status: 500 }
      );
    }

    return NextResponse.json({ shippingMethods: methods });
  } catch (error) {
    loggers.api.error({ error }, 'Shipping methods error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/shipping-methods - Create shipping method
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
    const parseResult = ShippingMethodSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const data = parseResult.data;

    const { data: method, error } = await supabase
      .from('shipping_methods')
      .insert({
        site_id: params.siteId,
        name: data.name,
        description: data.description,
        price: data.price,
        min_order_value: data.minOrderValue,
        max_order_value: data.maxOrderValue,
        estimated_days: data.estimatedDays,
        is_active: data.isActive,
        countries: data.countries,
        regions: data.regions,
      })
      .select()
      .single();

    if (error) {
      loggers.api.error({ error }, 'Error creating shipping method');
      return NextResponse.json(
        { error: 'Failed to create shipping method' },
        { status: 500 }
      );
    }

    return NextResponse.json({ shippingMethod: method }, { status: 201 });
  } catch (error) {
    loggers.api.error({ error }, 'Create shipping method error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// PATCH /api/sites/[siteId]/shipping-methods - Update shipping method
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
    const { methodId, ...updates } = body;

    if (!methodId) {
      return NextResponse.json(
        { error: 'methodId is required' },
        { status: 400 }
      );
    }

    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.minOrderValue !== undefined) dbUpdates.min_order_value = updates.minOrderValue;
    if (updates.maxOrderValue !== undefined) dbUpdates.max_order_value = updates.maxOrderValue;
    if (updates.estimatedDays !== undefined) dbUpdates.estimated_days = updates.estimatedDays;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.countries !== undefined) dbUpdates.countries = updates.countries;
    if (updates.regions !== undefined) dbUpdates.regions = updates.regions;

    const { data: method, error } = await supabase
      .from('shipping_methods')
      .update(dbUpdates)
      .eq('id', methodId)
      .eq('site_id', params.siteId)
      .select()
      .single();

    if (error) {
      loggers.api.error({ error }, 'Error updating shipping method');
      return NextResponse.json(
        { error: 'Failed to update shipping method' },
        { status: 500 }
      );
    }

    return NextResponse.json({ shippingMethod: method });
  } catch (error) {
    loggers.api.error({ error }, 'Update shipping method error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/sites/[siteId]/shipping-methods - Delete shipping method
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
    const { methodId } = body;

    if (!methodId) {
      return NextResponse.json(
        { error: 'methodId is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('shipping_methods')
      .delete()
      .eq('id', methodId)
      .eq('site_id', params.siteId);

    if (error) {
      loggers.api.error({ error }, 'Error deleting shipping method');
      return NextResponse.json(
        { error: 'Failed to delete shipping method' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    loggers.api.error({ error }, 'Delete shipping method error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
