import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

const CART_COOKIE_NAME = 'cart_id';
const CART_EXPIRY_DAYS = 30;

async function getOrCreateCartId(siteId: string): Promise<string> {
  const cookieStore = await cookies();
  const cartCookieName = `${CART_COOKIE_NAME}_${siteId}`;
  let cartId = cookieStore.get(cartCookieName)?.value;

  if (!cartId) {
    cartId = nanoid();
    cookieStore.set(cartCookieName, cartId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * CART_EXPIRY_DAYS,
    });
  }

  return cartId;
}

// GET /api/sites/[siteId]/cart - Get current cart
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const cartId = await getOrCreateCartId(params.siteId);
    const supabase = await createClient();

    const { data: cart, error } = await supabase
      .from('carts')
      .select(`
        *,
        cart_items (
          *,
          products (id, name, slug, images, price, compare_at_price, track_inventory, quantity),
          product_variants (id, name, price, quantity, options, image_url)
        )
      `)
      .eq('cart_token', cartId)
      .eq('site_id', params.siteId)
      .single();

    if (error || !cart) {
      // Return empty cart
      return NextResponse.json({
        cart: {
          items: [],
          subtotal: 0,
          total: 0,
          itemCount: 0,
        },
      });
    }

    // Calculate totals
    let subtotal = 0;
    let itemCount = 0;

    for (const item of cart.cart_items || []) {
      const price = item.product_variants?.price || item.products?.price || 0;
      subtotal += price * item.quantity;
      itemCount += item.quantity;
    }

    return NextResponse.json({
      cart: {
        id: cart.id,
        items: cart.cart_items,
        subtotal,
        discountCode: cart.discount_code,
        discountAmount: cart.discount_amount || 0,
        total: subtotal - (cart.discount_amount || 0),
        itemCount,
      },
    });
  } catch (error) {
    console.error('Cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/cart/items - Add item to cart
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const body = await request.json();
    const { productId, variantId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const cartId = await getOrCreateCartId(params.siteId);
    const supabase = await createClient();

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, track_inventory, quantity, status')
      .eq('id', productId)
      .eq('site_id', params.siteId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.status !== 'active') {
      return NextResponse.json(
        { error: 'Product is not available' },
        { status: 400 }
      );
    }

    // Check inventory if tracking
    if (product.track_inventory && product.quantity < quantity) {
      return NextResponse.json(
        { error: 'Not enough stock available' },
        { status: 400 }
      );
    }

    // Get or create cart
    let { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('cart_token', cartId)
      .eq('site_id', params.siteId)
      .single();

    if (!cart) {
      const { data: newCart, error: cartError } = await supabase
        .from('carts')
        .insert({
          site_id: params.siteId,
          cart_token: cartId,
        })
        .select()
        .single();

      if (cartError) {
        console.error('Error creating cart:', cartError);
        return NextResponse.json(
          { error: 'Failed to create cart' },
          { status: 500 }
        );
      }

      cart = newCart;
    }

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to get or create cart' },
        { status: 500 }
      );
    }

    // Check if item already exists
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .eq('variant_id', variantId || null)
      .single();

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id);

      if (updateError) {
        console.error('Error updating cart item:', updateError);
        return NextResponse.json(
          { error: 'Failed to update cart' },
          { status: 500 }
        );
      }
    } else {
      // Add new item
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: productId,
          variant_id: variantId,
          quantity,
        });

      if (insertError) {
        console.error('Error adding cart item:', insertError);
        return NextResponse.json(
          { error: 'Failed to add item to cart' },
          { status: 500 }
        );
      }
    }

    // Return updated cart
    const { data: updatedCart } = await supabase
      .from('carts')
      .select(`
        *,
        cart_items (
          *,
          products (id, name, slug, images, price, compare_at_price),
          product_variants (id, name, price, options, image_url)
        )
      `)
      .eq('id', cart.id)
      .single();

    let subtotal = 0;
    let itemCount = 0;

    for (const item of updatedCart?.cart_items || []) {
      const price = item.product_variants?.price || item.products?.price || 0;
      subtotal += price * item.quantity;
      itemCount += item.quantity;
    }

    return NextResponse.json({
      cart: {
        id: updatedCart?.id,
        items: updatedCart?.cart_items,
        subtotal,
        total: subtotal - (updatedCart?.discount_amount || 0),
        itemCount,
      },
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// PATCH /api/sites/[siteId]/cart/items - Update cart item quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const body = await request.json();
    const { itemId, quantity } = body;

    if (!itemId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Item ID and quantity are required' },
        { status: 400 }
      );
    }

    const cartId = await getOrCreateCartId(params.siteId);
    const supabase = await createClient();

    // Get cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('cart_token', cartId)
      .eq('site_id', params.siteId)
      .single();

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    if (quantity <= 0) {
      // Remove item
      await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('cart_id', cart.id);
    } else {
      // Update quantity
      await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .eq('cart_id', cart.id);
    }

    // Return updated cart
    const { data: updatedCart } = await supabase
      .from('carts')
      .select(`
        *,
        cart_items (
          *,
          products (id, name, slug, images, price, compare_at_price),
          product_variants (id, name, price, options, image_url)
        )
      `)
      .eq('id', cart.id)
      .single();

    let subtotal = 0;
    let itemCount = 0;

    for (const item of updatedCart?.cart_items || []) {
      const price = item.product_variants?.price || item.products?.price || 0;
      subtotal += price * item.quantity;
      itemCount += item.quantity;
    }

    return NextResponse.json({
      cart: {
        id: updatedCart?.id,
        items: updatedCart?.cart_items,
        subtotal,
        total: subtotal - (updatedCart?.discount_amount || 0),
        itemCount,
      },
    });
  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE /api/sites/[siteId]/cart - Clear cart
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const cartId = await getOrCreateCartId(params.siteId);
    const supabase = await createClient();

    // Get cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('cart_token', cartId)
      .eq('site_id', params.siteId)
      .single();

    if (cart) {
      // Delete all cart items
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);
    }

    return NextResponse.json({
      cart: {
        items: [],
        subtotal: 0,
        total: 0,
        itemCount: 0,
      },
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
