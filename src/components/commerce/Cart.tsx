'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ShoppingCart, Minus, Plus, Trash2, Tag, X } from 'lucide-react';
import type { Cart, CartItem } from '@/lib/commerce';

interface CartProps {
  cart: Cart;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onApplyDiscount: (code: string) => Promise<boolean>;
  onRemoveDiscount: () => void;
  onCheckout: () => void;
}

export function CartDrawer({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onApplyDiscount,
  onRemoveDiscount,
  onCheckout,
}: CartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;

    setIsApplyingDiscount(true);
    setDiscountError(null);

    try {
      const success = await onApplyDiscount(discountCode);
      if (!success) {
        setDiscountError('Invalid discount code');
      } else {
        setDiscountCode('');
      }
    } catch (err) {
      setDiscountError('Failed to apply discount');
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <ShoppingCart className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-sm mt-1">Add some items to get started</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-auto py-4 space-y-4">
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveItem}
                />
              ))}
            </div>

            {/* Discount Code */}
            <div className="border-t pt-4">
              {cart.discountCode ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium">{cart.discountCode}</span>
                    <span className="text-sm">applied</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-green-700"
                    onClick={onRemoveDiscount}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Discount code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyDiscount}
                      disabled={isApplyingDiscount || !discountCode.trim()}
                    >
                      Apply
                    </Button>
                  </div>
                  {discountError && (
                    <p className="text-sm text-red-500">{discountError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              {cart.discountTotal > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(cart.discountTotal)}</span>
                </div>
              )}
              {cart.shippingTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>{formatPrice(cart.shippingTotal)}</span>
                </div>
              )}
              {cart.taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatPrice(cart.taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
            </div>

            <SheetFooter className="pt-4">
              <Button className="w-full" size="lg" onClick={onCheckout}>
                Proceed to Checkout
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="flex gap-4">
      {/* Image */}
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ShoppingCart className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>

        {Object.keys(item.properties).length > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">
            {Object.entries(item.properties)
              .map(([key, value]) => `${key}: ${value}`)
              .join(' / ')}
          </p>
        )}

        <p className="font-medium mt-1">{formatPrice(item.price)}</p>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-500"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Line Total */}
      <div className="text-right">
        <span className="font-medium">
          {formatPrice(item.price * item.quantity)}
        </span>
      </div>
    </div>
  );
}

export default CartDrawer;
