import { z } from 'zod';

// ============================================
// PRODUCTS
// ============================================

// Product Status
export const ProductStatusEnum = z.enum(['draft', 'active', 'archived']);
export type ProductStatus = z.infer<typeof ProductStatusEnum>;

// Product Image
export const ProductImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  alt: z.string().optional(),
  position: z.number().default(0),
});

export type ProductImage = z.infer<typeof ProductImageSchema>;

// Product Category
export const ProductCategorySchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  parentId: z.string().uuid().optional(),
  orderIndex: z.number().default(0),
  createdAt: z.date(),
});

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

// Product Variant
export const ProductVariantSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string(),
  sku: z.string().optional(),
  price: z.number().optional(),
  compareAtPrice: z.number().optional(),
  quantity: z.number().default(0),
  options: z.record(z.string()).default({}),
  imageUrl: z.string().url().optional(),
  weight: z.number().optional(),
  createdAt: z.date(),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

// Product Schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  images: z.array(ProductImageSchema).default([]),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  costPrice: z.number().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  trackInventory: z.boolean().default(false),
  quantity: z.number().default(0),
  allowBackorder: z.boolean().default(false),
  weight: z.number().optional(),
  weightUnit: z.enum(['lb', 'kg', 'oz', 'g']).default('lb'),
  requiresShipping: z.boolean().default(true),
  isDigital: z.boolean().default(false),
  digitalFileUrl: z.string().url().optional(),
  status: ProductStatusEnum.default('draft'),
  metadata: z.record(z.unknown()).default({}),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;

// Product with variants and categories
export interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  categories: ProductCategory[];
}

// ============================================
// CUSTOMERS
// ============================================

// Customer Address
export const CustomerAddressSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  type: z.enum(['billing', 'shipping']).default('shipping'),
  isDefault: z.boolean().default(false),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('US'),
  phone: z.string().optional(),
  createdAt: z.date(),
});

export type CustomerAddress = z.infer<typeof CustomerAddressSchema>;

// Customer Schema
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  siteUserId: z.string().uuid().optional(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  acceptsMarketing: z.boolean().default(false),
  totalOrders: z.number().default(0),
  totalSpent: z.number().default(0),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Customer = z.infer<typeof CustomerSchema>;

// ============================================
// ORDERS
// ============================================

// Order Status
export const OrderStatusEnum = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'partially_refunded',
]);

export type OrderStatus = z.infer<typeof OrderStatusEnum>;

// Payment Status
export const PaymentStatusEnum = z.enum([
  'pending',
  'authorized',
  'paid',
  'partially_paid',
  'refunded',
  'voided',
  'failed',
]);

export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

// Fulfillment Status
export const FulfillmentStatusEnum = z.enum([
  'unfulfilled',
  'partially_fulfilled',
  'fulfilled',
]);

export type FulfillmentStatus = z.infer<typeof FulfillmentStatusEnum>;

// Order Item
export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  name: z.string(),
  sku: z.string().optional(),
  quantity: z.number(),
  price: z.number(),
  total: z.number(),
  properties: z.record(z.unknown()).default({}),
  fulfilledQuantity: z.number().default(0),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

// Order Address
export const OrderAddressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('US'),
  phone: z.string().optional(),
});

export type OrderAddress = z.infer<typeof OrderAddressSchema>;

// Shipping Method
export const ShippingMethodSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  estimatedDays: z.string().optional(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
});

export type ShippingMethod = z.infer<typeof ShippingMethodSchema>;

// Order Schema
export const OrderSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  orderNumber: z.string(),
  customerId: z.string().uuid().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  status: OrderStatusEnum.default('pending'),
  paymentStatus: PaymentStatusEnum.default('pending'),
  fulfillmentStatus: FulfillmentStatusEnum.default('unfulfilled'),
  currency: z.string().default('USD'),
  subtotal: z.number(),
  discountTotal: z.number().default(0),
  shippingTotal: z.number().default(0),
  taxTotal: z.number().default(0),
  total: z.number(),
  discountCodeId: z.string().uuid().optional(),
  billingAddress: OrderAddressSchema.optional(),
  shippingAddress: OrderAddressSchema.optional(),
  shippingMethod: ShippingMethodSchema.optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Order = z.infer<typeof OrderSchema>;

// Order with items
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// ============================================
// PAYMENTS
// ============================================

// Payment Status (reuse PaymentStatusEnum or create specific)
export const PaymentTransactionStatusEnum = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
]);

export type PaymentTransactionStatus = z.infer<typeof PaymentTransactionStatusEnum>;

// Payment Schema
export const PaymentSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  amount: z.number(),
  currency: z.string().default('USD'),
  status: PaymentTransactionStatusEnum.default('pending'),
  provider: z.enum(['stripe', 'paypal', 'manual']).default('stripe'),
  providerPaymentId: z.string().optional(),
  providerData: z.record(z.unknown()).default({}),
  errorMessage: z.string().optional(),
  refundedAmount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// ============================================
// DISCOUNT CODES
// ============================================

export const DiscountTypeEnum = z.enum(['percentage', 'fixed_amount', 'free_shipping']);
export type DiscountType = z.infer<typeof DiscountTypeEnum>;

export const DiscountCodeSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  code: z.string(),
  type: DiscountTypeEnum,
  value: z.number(),
  minOrderAmount: z.number().optional(),
  maxUses: z.number().optional(),
  usesCount: z.number().default(0),
  maxUsesPerCustomer: z.number().default(1),
  appliesTo: z.enum(['all', 'products', 'categories']).default('all'),
  appliesToIds: z.array(z.string().uuid()).default([]),
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
});

export type DiscountCode = z.infer<typeof DiscountCodeSchema>;

// ============================================
// SHIPPING
// ============================================

export const ShippingZoneSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string(),
  countries: z.array(z.string()).default([]),
  states: z.array(z.string()).default([]),
  postalCodes: z.array(z.string()).default([]),
  createdAt: z.date(),
});

export type ShippingZone = z.infer<typeof ShippingZoneSchema>;

export const ShippingRateSchema = z.object({
  id: z.string().uuid(),
  zoneId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['flat', 'weight', 'price', 'free']),
  price: z.number().optional(),
  minWeight: z.number().optional(),
  maxWeight: z.number().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  conditions: z.record(z.unknown()).default({}),
});

export type ShippingRate = z.infer<typeof ShippingRateSchema>;

// ============================================
// CART
// ============================================

export const CartItemSchema = z.object({
  id: z.string(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  image: z.string().url().optional(),
  properties: z.record(z.string()).default({}),
});

export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: z.string(),
  siteId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  items: z.array(CartItemSchema).default([]),
  discountCode: z.string().optional(),
  subtotal: z.number().default(0),
  discountTotal: z.number().default(0),
  shippingTotal: z.number().default(0),
  taxTotal: z.number().default(0),
  total: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Cart = z.infer<typeof CartSchema>;

// ============================================
// STRIPE CONNECT
// ============================================

export const StripeAccountSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  stripeAccountId: z.string(),
  chargesEnabled: z.boolean().default(false),
  payoutsEnabled: z.boolean().default(false),
  detailsSubmitted: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type StripeAccount = z.infer<typeof StripeAccountSchema>;
