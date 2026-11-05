import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  ShieldCheck,
  X,
  CreditCard,
  Lock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getStripe } from '../../utils/stripe';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  paymentType: 'WALLET_TOPUP' | 'CONSUMER_ORDER' | 'STOCK_REQUISITION' | 'OUTLET_REQUISITION';
  title?: string;
  description?: string;
  referenceId?: string | number;
  metadata?: Record<string, string>;
  payloadData?: Record<string, any>;
  onSuccess: (data: any) => void;
}

// Inner Form Component requiring Stripe Elements context
const CheckoutForm: React.FC<{
  amount: number;
  paymentType: string;
  referenceId?: string | number;
  payloadData?: Record<string, any>;
  onSuccess: (data: any) => void;
  onClose: () => void;
}> = ({ amount, paymentType, referenceId, payloadData, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment processing failed. Please check your card details.');
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm & fulfill business logic on backend
        const confirmRes = await fetch('http://localhost:8080/api/v1/payments/stripe/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            payment_type: paymentType,
            reference_id: referenceId ? String(referenceId) : null,
            ...payloadData,
          }),
        });

        const confirmData = await confirmRes.json();
        setSuccess(true);
        setTimeout(() => {
          onSuccess(confirmData);
          onClose();
        }, 1200);
      } else {
        setErrorMessage('Payment did not complete. Status: ' + (paymentIntent?.status || 'unknown'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while confirming payment.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>Payment verified successfully! Fulfilling transaction...</span>
        </div>
      )}

      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 px-1">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-mono text-[11px]">256-bit SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-slate-700 dark:text-zinc-300">Powered by</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">STRIPE</span>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          disabled={processing}
          onClick={onClose}
          className="w-1/3 py-3 px-4 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={!stripe || processing || success}
          className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {processing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Authorizing ৳{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Payment Complete!</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Pay ৳{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  paymentType,
  title,
  description,
  referenceId,
  metadata,
  payloadData,
  onSuccess,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || amount <= 0) return;

    let isMounted = true;
    setLoadingIntent(true);
    setInitError(null);
    setClientSecret(null);

    const initPaymentIntent = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/payments/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amount,
            currency: 'bdt',
            payment_type: paymentType,
            reference_id: referenceId ? String(referenceId) : null,
            description: description || `FizzDrop ${paymentType} Payment`,
            metadata: metadata || {},
            payload_data: payloadData || {},
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.client_secret) {
          throw new Error(data.message || 'Unable to initialize Stripe session');
        }

        if (isMounted) {
          setClientSecret(data.client_secret);
        }
      } catch (err: any) {
        if (isMounted) {
          setInitError(err.message || 'Failed to connect to Stripe server');
        }
      } finally {
        if (isMounted) {
          setLoadingIntent(false);
        }
      }
    };

    initPaymentIntent();

    return () => {
      isMounted = false;
    };
  }, [isOpen, amount, paymentType, referenceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <CreditCard className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                  STRIPE EMBEDDED CHECKOUT
                </span>
              </div>
              <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                {title || 'Secure Online Card Payment'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Order / Transaction Summary Header */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">
                Total Transaction Due
              </span>
              <span className="font-oswald text-2xl font-black text-slate-900 dark:text-white">
                ৳{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-mono font-normal text-slate-500">BDT</span>
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 font-bold px-2 py-1 rounded-full bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 shadow-xs inline-block">
                {paymentType.replace('_', ' ')}
              </span>
              {referenceId && (
                <span className="text-[11px] font-mono text-slate-400 block mt-1">
                  Ref: #{referenceId}
                </span>
              )}
            </div>
          </div>

          {/* Loading Intent Spinner */}
          {loadingIntent && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                Initializing encrypted Stripe payment session...
              </p>
            </div>
          )}

          {/* Initialization Error */}
          {!loadingIntent && initError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Failed to initialize Stripe Payment</span>
              </div>
              <p>{initError}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          )}

          {/* Live Stripe Elements Form */}
          {!loadingIntent && clientSecret && (
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#4f46e5',
                    borderRadius: '12px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  },
                },
              }}
            >
              <CheckoutForm
                amount={amount}
                paymentType={paymentType}
                referenceId={referenceId}
                payloadData={payloadData}
                onSuccess={onSuccess}
                onClose={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};
