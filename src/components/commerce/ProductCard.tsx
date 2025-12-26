'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import type { Product } from '@/lib/commerce';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  onWishlist?: (product: Product) => void;
  className?: string;
}

export function ProductCard({
  product,
  onAddToCart,
  onQuickView,
  onWishlist,
  className,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const mainImage = product.images[0]?.url;
  const hoverImage = product.images[1]?.url;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0;

  const isOutOfStock = product.trackInventory && product.quantity === 0 && !product.allowBackorder;

  return (
    <div
      className={cn(
        'group relative bg-white rounded-lg overflow-hidden border transition-shadow hover:shadow-lg',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="aspect-square relative overflow-hidden bg-gray-100">
        {mainImage && !imageError ? (
          <>
            <img
              src={isHovered && hoverImage ? hoverImage : mainImage}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ShoppingCart className="h-12 w-12" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {hasDiscount && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
              -{discountPercent}%
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2 py-1 bg-gray-800 text-white text-xs font-semibold rounded">
              Out of Stock
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div
          className={cn(
            'absolute top-3 right-3 flex flex-col gap-2 transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          {onWishlist && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-white shadow-md"
              onClick={(e) => {
                e.preventDefault();
                onWishlist(product);
              }}
            >
              <Heart className="h-4 w-4" />
            </Button>
          )}
          {onQuickView && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-white shadow-md"
              onClick={(e) => {
                e.preventDefault();
                onQuickView(product);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Add to Cart Button */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 p-3 transition-all',
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          <Button
            className="w-full"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart(product);
            }}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {product.shortDescription && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {product.shortDescription}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <span className="font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
