'use client';

import { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// Load Stripe outside of component to avoid recreating on every render
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePromise && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

interface PaymentFormProps {
  orderId: string;
  orderNumber: string;
  amount: number;
  returnUrl: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

function PaymentForm({
  orderId,
  orderNumber,
  amount,
  returnUrl,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!stripe) return;

    // Check for payment status in URL
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (clientSecret) {
      stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        switch (paymentIntent?.status) {
          case 'succeeded':
            setMessage('Payment successful!');
            setIsSuccess(true);
            onSuccess?.();
            break;
          case 'processing':
            setMessage('Your payment is processing.');
            break;
          case 'requires_payment_method':
            setMessage('Please provide payment details.');
            break;
          default:
            setMessage('Something went wrong.');
            break;
        }
      });
    }
  }, [stripe, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    // This point will only be reached if there is an immediate error
    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message || 'An error occurred');
      } else {
        setMessage('An unexpected error occurred.');
      }
      onError?.(error.message || 'Payment failed');
    }

    setIsProcessing(false);
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-green-700 mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-600">
          Thank you for your order #{orderNumber}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Order Total</span>
          <span className="text-2xl font-bold">
            ${(amount / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.includes('successful')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          <AlertCircle className="h-5 w-5" />
          {message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${(amount / 100).toFixed(2)}`
        )}
      </Button>

      <p className="text-center text-sm text-gray-500">
        Your payment is secured by Stripe
      </p>
    </form>
  );
}

interface CheckoutFormProps {
  clientSecret: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  returnUrl: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function CheckoutForm({
  clientSecret,
  orderId,
  orderNumber,
  amount,
  returnUrl,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  const stripePromise = getStripe();

  if (!stripePromise) {
    return (
      <div className="text-center py-8 text-red-600">
        <AlertCircle className="mx-auto h-12 w-12 mb-4" />
        <p>Payment system is not configured.</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0F172A',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
        },
      }}
    >
      <PaymentForm
        orderId={orderId}
        orderNumber={orderNumber}
        amount={amount}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}

// Order Summary Component
interface OrderSummaryProps {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
    variant?: string;
  }>;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
}

export function OrderSummary({
  items,
  subtotal,
  shipping,
  discount,
  tax,
  total,
}: OrderSummaryProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

      <div className="space-y-4 mb-6">
        {items.map((item, index) => (
          <div key={index} className="flex gap-4">
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              {item.variant && (
                <p className="text-sm text-gray-500">{item.variant}</p>
              )}
              <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
            </div>
            <p className="font-medium">
              ${(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {shipping > 0 && (
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>${shipping.toFixed(2)}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}

        {tax > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-lg pt-2 border-t">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
