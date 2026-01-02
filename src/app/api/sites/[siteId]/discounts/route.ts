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

// Zod schema for discount creation
const DiscountCreateSchema = z.object({
  code: z.string().min(1).max(50).transform((v) => v.toUpperCase()),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.number().min(0),
  minOrderValue: z.number().min(0).optional(),
  maxDiscountValue: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  description: z.string().max(255).optional(),
  appliesTo: z.enum(['all', 'products', 'categories']).default('all'),
  productIds: z.array(z.string().uuid()).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
});

// GET /api/sites/[siteId]/discounts - List all discounts
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
    const active = searchParams.get('active');

    let query = supabase
      .from('discounts')
      .select('*', { count: 'exact' })
      .eq('site_id', params.siteId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (active === 'true') {
      query = query.eq('is_active', true);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
    }

    const { data: discounts, count, error } = await query;

    if (error) {
      loggers.api.error({ error }, 'Error fetching discounts');
      return NextResponse.json(
        { error: 'Failed to fetch discounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      discounts,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Discounts error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/discounts - Create a discount
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
    const parseResult = DiscountCreateSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const data = parseResult.data;

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('discounts')
      .select('id')
      .eq('site_id', params.siteId)
      .eq('code', data.code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Discount code already exists' },
        { status: 400 }
      );
    }

    const { data: discount, error } = await supabase
      .from('discounts')
      .insert({
        site_id: params.siteId,
        code: data.code,
        type: data.type,
        value: data.value,
        min_order_value: data.minOrderValue,
        max_discount_value: data.maxDiscountValue,
        max_uses: data.maxUses,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
        is_active: data.isActive,
        description: data.description,
        applies_to: data.appliesTo,
        product_ids: data.productIds,
        category_ids: data.categoryIds,
        use_count: 0,
      })
      .select()
      .single();

    if (error) {
      loggers.api.error({ error }, 'Error creating discount');
      return NextResponse.json(
        { error: 'Failed to create discount' },
        { status: 500 }
      );
    }

    return NextResponse.json({ discount }, { status: 201 });
  } catch (error) {
    loggers.api.error({ error }, 'Create discount error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// PATCH /api/sites/[siteId]/discounts - Update a discount
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
    const { discountId, ...updates } = body;

    if (!discountId) {
      return NextResponse.json(
        { error: 'discountId is required' },
        { status: 400 }
      );
    }

    // Transform field names to snake_case
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.minOrderValue !== undefined) dbUpdates.min_order_value = updates.minOrderValue;
    if (updates.maxDiscountValue !== undefined) dbUpdates.max_discount_value = updates.maxDiscountValue;
    if (updates.maxUses !== undefined) dbUpdates.max_uses = updates.maxUses;
    if (updates.startsAt !== undefined) dbUpdates.starts_at = updates.startsAt;
    if (updates.endsAt !== undefined) dbUpdates.ends_at = updates.endsAt;
    if (updates.description !== undefined) dbUpdates.description = updates.description;

    const { data: discount, error } = await supabase
      .from('discounts')
      .update(dbUpdates)
      .eq('id', discountId)
      .eq('site_id', params.siteId)
      .select()
      .single();

    if (error) {
      loggers.api.error({ error }, 'Error updating discount');
      return NextResponse.json(
        { error: 'Failed to update discount' },
        { status: 500 }
      );
    }

    return NextResponse.json({ discount });
  } catch (error) {
    loggers.api.error({ error }, 'Update discount error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/sites/[siteId]/discounts - Delete a discount
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
    const { discountId } = body;

    if (!discountId) {
      return NextResponse.json(
        { error: 'discountId is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', discountId)
      .eq('site_id', params.siteId);

    if (error) {
      loggers.api.error({ error }, 'Error deleting discount');
      return NextResponse.json(
        { error: 'Failed to delete discount' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    loggers.api.error({ error }, 'Delete discount error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
