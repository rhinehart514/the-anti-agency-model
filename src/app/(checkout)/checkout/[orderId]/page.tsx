'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckoutForm, OrderSummary } from '@/components/commerce/CheckoutForm';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_cost: number;
  total: number;
  email: string;
  shipping_address: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  order_items: Array<{
    product_snapshot: {
      name: string;
      price: number;
      image?: string;
      options?: Record<string, string>;
    };
    quantity: number;
    unit_price: number;
  }>;
  metadata?: {
    stripe_payment_intent_id?: string;
  };
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paymentIntentStatus = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  useEffect(() => {
    async function fetchOrder() {
      try {
        // Determine site ID from URL or localStorage
        const siteId = localStorage.getItem('checkout_site_id');

        if (!siteId) {
          setError('Site information not found. Please return to the store.');
          setIsLoading(false);
          return;
        }

        // Fetch order details
        const orderRes = await fetch(`/api/sites/${siteId}/orders/${orderId}`);

        if (!orderRes.ok) {
          throw new Error('Order not found');
        }

        const { order: orderData } = await orderRes.json();
        setOrder(orderData);

        // If order is already paid, show success
        if (orderData.payment_status === 'paid') {
          setIsLoading(false);
          return;
        }

        // Fetch payment intent client secret if not already paid
        if (orderData.metadata?.stripe_payment_intent_id) {
          const paymentRes = await fetch(
            `/api/sites/${siteId}/orders/${orderId}/payment-intent`
          );

          if (paymentRes.ok) {
            const { clientSecret: secret } = await paymentRes.json();
            setClientSecret(secret);
          }
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  // Handle redirect from Stripe
  useEffect(() => {
    if (redirectStatus === 'succeeded' && order) {
      // Refresh order to get updated status
      const siteId = localStorage.getItem('checkout_site_id');
      if (siteId) {
        fetch(`/api/sites/${siteId}/orders/${orderId}`)
          .then((res) => res.json())
          .then(({ order: updatedOrder }) => {
            setOrder(updatedOrder);
          });
      }
    }
  }, [redirectStatus, orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-gray-400" />
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Checkout Error
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The order you're looking for doesn't exist or has expired.
          </p>
          <Button onClick={() => router.push('/')}>
            Return to Store
          </Button>
        </div>
      </div>
    );
  }

  // Order already paid
  if (order.payment_status === 'paid' || redirectStatus === 'succeeded') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <CheckCircle2 className="mx-auto h-20 w-20 text-green-500 mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Thank You for Your Order!
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Order #{order.order_number}
            </p>
            <p className="text-gray-500 mb-8">
              A confirmation email has been sent to {order.email}
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-lg mb-4">Order Details</h2>
              <div className="space-y-3">
                {order.order_items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>
                      {item.product_snapshot.name} x {item.quantity}
                    </span>
                    <span className="font-medium">
                      ${(item.unit_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${order.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.shipping_cost > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Shipping</span>
                      <span>${order.shipping_cost.toFixed(2)}</span>
                    </div>
                  )}
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax</span>
                      <span>${order.tax_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total Paid</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-lg mb-4">Shipping Address</h2>
              <p>
                {order.shipping_address.firstName} {order.shipping_address.lastName}
              </p>
              <p>{order.shipping_address.address1}</p>
              {order.shipping_address.address2 && (
                <p>{order.shipping_address.address2}</p>
              )}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state}{' '}
                {order.shipping_address.postalCode}
              </p>
              <p>{order.shipping_address.country}</p>
            </div>

            <Button onClick={() => router.push('/')} size="lg">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Payment form
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Store
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Payment Form */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h1 className="text-2xl font-bold mb-2">Complete Your Order</h1>
            <p className="text-gray-600 mb-8">
              Order #{order.order_number}
            </p>

            {clientSecret ? (
              <CheckoutForm
                clientSecret={clientSecret}
                orderId={order.id}
                orderNumber={order.order_number}
                amount={Math.round(order.total * 100)}
                returnUrl={`${window.location.origin}/checkout/${order.id}`}
                onSuccess={() => {
                  // Refresh order
                  window.location.reload();
                }}
              />
            ) : (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-4 text-gray-600">Loading payment form...</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <OrderSummary
              items={order.order_items.map((item) => ({
                name: item.product_snapshot.name,
                quantity: item.quantity,
                price: item.unit_price,
                image: item.product_snapshot.image,
                variant: item.product_snapshot.options
                  ? Object.values(item.product_snapshot.options).join(' / ')
                  : undefined,
              }))}
              subtotal={order.subtotal}
              shipping={order.shipping_cost}
              discount={order.discount_amount}
              tax={order.tax_amount}
              total={order.total}
            />

            <div className="mt-6 bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-4">Shipping To</h3>
              <p className="text-gray-600">
                {order.shipping_address.firstName} {order.shipping_address.lastName}
              </p>
              <p className="text-gray-600">{order.shipping_address.address1}</p>
              {order.shipping_address.address2 && (
                <p className="text-gray-600">{order.shipping_address.address2}</p>
              )}
              <p className="text-gray-600">
                {order.shipping_address.city}, {order.shipping_address.state}{' '}
                {order.shipping_address.postalCode}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
