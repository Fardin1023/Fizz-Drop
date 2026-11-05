import { loadStripe, Stripe } from '@stripe/stripe-js';

const PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_51UYIcg4epuOkCupHyDWOkrxZbcceGgypgLQ37zY61CkX5tvTRnfgIWPFG49rWuAM3YLnmIaPinehU8KuLsfNwplk007pv0wXYz';

let stripePromise: Promise<Stripe | null>;

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = loadStripe(PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export const STRIPE_PUBLISHABLE_KEY = PUBLISHABLE_KEY;
