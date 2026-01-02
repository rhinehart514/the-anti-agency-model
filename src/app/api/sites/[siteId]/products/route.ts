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

// Zod schema for product creation
const ProductCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  images: z.array(z.string().url()).optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  trackInventory: z.boolean().optional(),
  quantity: z.number().int().min(0).optional(),
  allowBackorder: z.boolean().optional(),
  weight: z.number().min(0).optional(),
  weightUnit: z.enum(['lb', 'kg', 'oz', 'g']).optional(),
  requiresShipping: z.boolean().optional(),
  isDigital: z.boolean().optional(),
  digitalFileUrl: z.string().url().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  metadata: z.record(z.any()).optional(),
  seoTitle: z.string().max(100).optional(),
  seoDescription: z.string().max(300).optional(),
  variants: z.array(z.object({
    name: z.string(),
    sku: z.string().optional(),
    price: z.number().min(0),
    compareAtPrice: z.number().min(0).optional(),
    quantity: z.number().int().min(0).optional(),
    options: z.record(z.string()).optional(),
    imageUrl: z.string().url().optional(),
    weight: z.number().min(0).optional(),
  })).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
});

// GET /api/sites/[siteId]/products - List all products
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication and site ownership
    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = supabase
      .from('products')
      .select(`
        *,
        product_variants (*),
        product_category_links (
          category_id,
          product_categories (*)
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
      query = query.or(`name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
    }

    const { data: products, count, error } = await query;

    if (error) {
      loggers.api.error({ error }, 'Error fetching products');
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      products,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Products error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/products - Create a new product
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication and site ownership
    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate with Zod
    const parseResult = ProductCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const {
      name,
      slug,
      description,
      shortDescription,
      images,
      price,
      compareAtPrice,
      costPrice,
      sku,
      barcode,
      trackInventory,
      quantity,
      allowBackorder,
      weight,
      weightUnit,
      requiresShipping,
      isDigital,
      digitalFileUrl,
      status,
      metadata,
      seoTitle,
      seoDescription,
      variants,
      categoryIds,
    } = parseResult.data;

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        site_id: params.siteId,
        name,
        slug,
        description,
        short_description: shortDescription,
        images: images || [],
        price,
        compare_at_price: compareAtPrice,
        cost_price: costPrice,
        sku,
        barcode,
        track_inventory: trackInventory || false,
        quantity: quantity || 0,
        allow_backorder: allowBackorder || false,
        weight,
        weight_unit: weightUnit || 'lb',
        requires_shipping: requiresShipping !== false,
        is_digital: isDigital || false,
        digital_file_url: digitalFileUrl,
        status: status || 'draft',
        metadata: metadata || {},
        seo_title: seoTitle,
        seo_description: seoDescription,
      })
      .select()
      .single();

    if (productError) {
      loggers.api.error({ error: productError }, 'Error creating product');
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    // Create variants if provided
    if (variants && Array.isArray(variants) && variants.length > 0) {
      const variantsToInsert = variants.map((variant: any) => ({
        product_id: product.id,
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        compare_at_price: variant.compareAtPrice,
        quantity: variant.quantity || 0,
        options: variant.options || {},
        image_url: variant.imageUrl,
        weight: variant.weight,
      }));

      await supabase.from('product_variants').insert(variantsToInsert);
    }

    // Link categories if provided
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      const links = categoryIds.map((categoryId: string) => ({
        product_id: product.id,
        category_id: categoryId,
      }));

      await supabase.from('product_category_links').insert(links);
    }

    // Fetch complete product
    const { data: completeProduct } = await supabase
      .from('products')
      .select(`
        *,
        product_variants (*),
        product_category_links (
          category_id,
          product_categories (*)
        )
      `)
      .eq('id', product.id)
      .single();

    return NextResponse.json({ product: completeProduct }, { status: 201 });
  } catch (error) {
    loggers.api.error({ error }, 'Create product error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
