import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/sites/[siteId]/products - List all products
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
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, count, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
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
    console.error('Products error:', error);
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
    const body = await request.json();
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
    } = body;

    if (!name || !slug || price === undefined) {
      return NextResponse.json(
        { error: 'Name, slug, and price are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

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
      console.error('Error creating product:', productError);
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
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
