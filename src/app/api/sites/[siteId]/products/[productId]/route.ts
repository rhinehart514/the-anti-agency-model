import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loggers } from '@/lib/logger';

// GET /api/sites/[siteId]/products/[productId] - Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; productId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variants (*),
        product_category_links (
          category_id,
          product_categories (*)
        )
      `)
      .eq('id', params.productId)
      .eq('site_id', params.siteId)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    loggers.api.error({ error }, 'Product error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/sites/[siteId]/products/[productId] - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: { siteId: string; productId: string } }
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

    const supabase = await createClient();

    // Update product
    const { data: product, error: productError } = await supabase
      .from('products')
      .update({
        name,
        slug,
        description,
        short_description: shortDescription,
        images,
        price,
        compare_at_price: compareAtPrice,
        cost_price: costPrice,
        sku,
        barcode,
        track_inventory: trackInventory,
        quantity,
        allow_backorder: allowBackorder,
        weight,
        weight_unit: weightUnit,
        requires_shipping: requiresShipping,
        is_digital: isDigital,
        digital_file_url: digitalFileUrl,
        status,
        metadata,
        seo_title: seoTitle,
        seo_description: seoDescription,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.productId)
      .eq('site_id', params.siteId)
      .select()
      .single();

    if (productError) {
      loggers.api.error({ error: productError }, 'Error updating product');
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    // Update variants if provided
    if (variants && Array.isArray(variants)) {
      // Delete existing variants
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', params.productId);

      // Insert new variants
      if (variants.length > 0) {
        const variantsToInsert = variants.map((variant: any) => ({
          product_id: params.productId,
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
    }

    // Update category links if provided
    if (categoryIds && Array.isArray(categoryIds)) {
      // Delete existing links
      await supabase
        .from('product_category_links')
        .delete()
        .eq('product_id', params.productId);

      // Insert new links
      if (categoryIds.length > 0) {
        const links = categoryIds.map((categoryId: string) => ({
          product_id: params.productId,
          category_id: categoryId,
        }));

        await supabase.from('product_category_links').insert(links);
      }
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
      .eq('id', params.productId)
      .single();

    return NextResponse.json({ product: completeProduct });
  } catch (error) {
    loggers.api.error({ error }, 'Update product error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE /api/sites/[siteId]/products/[productId] - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string; productId: string } }
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.productId)
      .eq('site_id', params.siteId);

    if (error) {
      loggers.api.error({ error }, 'Error deleting product');
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    loggers.api.error({ error }, 'Delete product error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
