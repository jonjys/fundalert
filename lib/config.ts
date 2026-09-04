import type { PlanId } from "./types";

export const FREE_RATE_LIMIT = 5;
export const ACCESS_COOKIE = "fa_access";
export const DEFAULT_ALERT_THRESHOLD_PCT = 0.05;

/** Live Stripe Payment Links (AI Commerce OS). Primary Weekly/Pro CTAs — no STRIPE_SECRET_KEY required. */
export const PAYMENT_LINKS: Partial<Record<PlanId, string>> = {
  weekly: "https://buy.stripe.com/9B6eVc2TLaR85io9j78og0n",
  pro: "https://buy.stripe.com/dRm5kC9i9aR8fX22UJ8og0o",
  // lifetime payment link pending approval — omit until live
};

export const BILLING_EMAIL = "billing@nyttolabs.com";

export function lifetimeMailto(): string {
  const subject = encodeURIComponent("Fundalert Lifetime — 1,990 SEK");
  const body = encodeURIComponent(
    "I want Fundalert Lifetime (1,990 SEK one-time). Please send a payment link.",
  );
  return `mailto:${BILLING_EMAIL}?subject=${subject}&body=${body}`;
}

export const PLANS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    priceLabel: string;
    amountSek: number;
    cadence: string;
    blurb: string;
    features: string[];
    mode: "subscription" | "payment";
    highlighted?: boolean;
  }
> = {
  weekly: {
    id: "weekly",
    name: "Weekly",
    priceLabel: "99 SEK",
    amountSek: 99,
    cadence: "per week",
    blurb: "Full radar for a funding cycle. Cancel anytime.",
    features: [
      "Full funding radar, all coins",
      "Binance USDT-M + Bybit linear",
      "Telegram threshold alerts",
      "Access code after checkout",
    ],
    mode: "subscription",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "399 SEK",
    amountSek: 399,
    cadence: "per month",
    blurb: "The desk setup. Refresh, sort, and get pinged.",
    features: [
      "Everything in Weekly",
      "Best value for active watching",
      "Alert settings that persist",
      "Priority if we add venues",
    ],
    mode: "subscription",
    highlighted: true,
  },
  lifetime: {
    id: "lifetime",
    name: "Lifetime",
    priceLabel: "1,990 SEK",
    amountSek: 1990,
    cadence: "one-time",
    blurb: "Pay once. Keep the radar.",
    features: [
      "Everything in Pro",
      "No renewals",
      "Access code never expires",
      "Same informational tool — no trading",
    ],
    mode: "payment",
  },
};

export function priceIdForPlan(plan: PlanId): string | null {
  const map: Record<PlanId, string | undefined> = {
    weekly: process.env.STRIPE_PRICE_WEEKLY,
    pro: process.env.STRIPE_PRICE_PRO,
    lifetime: process.env.STRIPE_PRICE_LIFETIME,
  };
  return map[plan] || null;
}

export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const pairs: Array<[PlanId, string | undefined]> = [
    ["weekly", process.env.STRIPE_PRICE_WEEKLY],
    ["pro", process.env.STRIPE_PRICE_PRO],
    ["lifetime", process.env.STRIPE_PRICE_LIFETIME],
  ];
  for (const [plan, id] of pairs) {
    if (id && id === priceId) return plan;
  }
  return null;
}

export function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function accessSecret(): string | null {
  return (
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    (process.env.NODE_ENV === "development" ? "fundalert-dev-secret" : null)
  );
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_WEEKLY &&
      process.env.STRIPE_PRICE_PRO &&
      process.env.STRIPE_PRICE_LIFETIME,
  );
}
