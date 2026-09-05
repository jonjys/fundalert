import type { PlanId } from "./types";

export const FREE_RATE_LIMIT = 5;
export const ACCESS_COOKIE = "fa_access";
export const REFERRAL_COOKIE = "fa_ref";
export const DEFAULT_ALERT_THRESHOLD_PCT = 0.05;
export const GIFT_TTL_MS = 48 * 60 * 60 * 1000;
export const INVITEE_BONUS_MS = 3 * 24 * 60 * 60 * 1000;
export const INVITER_REWARD_MS = 7 * 24 * 60 * 60 * 1000;

/** Live Stripe Payment Links (AI Commerce OS). CTAs work without STRIPE_SECRET_KEY. */
export const PAYMENT_LINKS: Partial<Record<PlanId, string>> = {
  trial: "https://buy.stripe.com/7sYdR851T8J0eSYanb8og0p",
  weekly: "https://buy.stripe.com/9B6eVc2TLaR85io9j78og0n",
  pro: "https://buy.stripe.com/dRm5kC9i9aR8fX22UJ8og0o",
  // lifetime payment link pending approval — omit until live
};

/** Known live price IDs. Env vars override; fallbacks keep Payment Link webhooks mappable. */
export const FALLBACK_PRICE_IDS: Record<PlanId, string> = {
  trial: "price_1UC3gNBEo0YzuylwRWwf8403",
  weekly: "price_1UBzVMBEo0YzuylwICEff8gs",
  pro: "price_1UBzVMBEo0YzuylwtyurR6vE",
  lifetime: "price_1UBzVMBEo0YzuylwxIQuqmoo",
};

export const BILLING_EMAIL = "billing@nyttolabs.com";

/** |funding %| at or above this is an "extreme" trade card. */
export const CARD_THRESHOLD_PCT = 0.05;
/** Conservative suggested size as % of equity. Scales with |funding|, then caps. */
export const CARD_SIZE_MIN_PCT = 5;
export const CARD_SIZE_MAX_PCT = 15;
/** Invalidation: rate flipped past this % onto the opposite side. */
export const CARD_FLIP_PCT = 0.01;
/** Invalidation: |rate| collapsed below max(threshold, issued × this). */
export const CARD_COLLAPSE_RATIO = 0.5;
/** Paper mark horizon — one typical funding interval. */
export const PAPER_HORIZON_MS = 8 * 60 * 60 * 1000;
export const PAPER_WINDOW_DAYS = 7;
export const CHANNEL_CARD_LIMIT = 3;
/** Telegram 4096-char cap — keep private alerts to a handful of full cards. */
export const TELEGRAM_CARD_LIMIT = 4;
export const CARD_DISCLAIMER =
  "Informational tip only. Not financial advice. You execute manually. No custody, no auto-orders.";
export const TELEGRAM_BOT_USERNAME = "F_fundalert_Bot";
export const TELEGRAM_BOT_URL = "https://t.me/F_fundalert_Bot";
export const PAPER_RULE =
  "Simulated. A card is issued when |funding| ≥ 0.05%. After 8h we re-read the same venue+contract. Win = same-sign carry still above the collapse level. Lose = rate flipped past ±0.01%. Flat = |rate| collapsed. Expired = venue missing at settle. Paper P&L ≈ size% × |issued funding| × (8h / interval) as % of equity — ignores mark-price, fees, and actual funding prints.";

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
    ctaLabel: string;
  }
> = {
  trial: {
    id: "trial",
    name: "Trial",
    priceLabel: "29 SEK",
    amountSek: 29,
    cadence: "3 days",
    blurb: "Telegram trade cards when funding goes extreme. Then upgrade if the desk is useful.",
    features: [
      "Trade cards for 3 days (bias, size, invalidation)",
      "Private Telegram alerts in the same card format",
      "Full live book + paper track record",
      "Tips only — you execute manually",
    ],
    mode: "payment",
    highlighted: true,
    ctaLabel: "Start 3-day trial — 29 SEK",
  },
  weekly: {
    id: "weekly",
    name: "Weekly",
    priceLabel: "99 SEK",
    amountSek: 99,
    cadence: "per week",
    blurb: "Trade cards for a funding cycle. Cancel anytime.",
    features: [
      "Extreme funding trade cards",
      "Binance + Bybit + OKX majors",
      "Telegram cards + watchlist filter",
      "Access code after checkout",
    ],
    mode: "subscription",
    ctaLabel: "Weekly — 99 SEK",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "399 SEK",
    amountSek: 399,
    cadence: "per month",
    blurb: "The desk setup. Cards, pings, and the full book.",
    features: [
      "Everything in Weekly",
      "Best value for active watching",
      "Alert settings that persist",
      "Priority if we add venues",
    ],
    mode: "subscription",
    ctaLabel: "Unlock Pro",
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
    ctaLabel: "Unlock Lifetime",
  },
};

export const SECONDARY_PLAN_IDS: PlanId[] = ["weekly", "pro", "lifetime"];

export function priceIdForPlan(plan: PlanId): string | null {
  const map: Record<PlanId, string | undefined> = {
    trial: process.env.STRIPE_PRICE_TRIAL,
    weekly: process.env.STRIPE_PRICE_WEEKLY,
    pro: process.env.STRIPE_PRICE_PRO,
    lifetime: process.env.STRIPE_PRICE_LIFETIME,
  };
  return map[plan] || FALLBACK_PRICE_IDS[plan] || null;
}

export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const pairs: Array<[PlanId, string | undefined]> = [
    ["trial", process.env.STRIPE_PRICE_TRIAL],
    ["weekly", process.env.STRIPE_PRICE_WEEKLY],
    ["pro", process.env.STRIPE_PRICE_PRO],
    ["lifetime", process.env.STRIPE_PRICE_LIFETIME],
  ];
  for (const [plan, id] of pairs) {
    if (id && id === priceId) return plan;
  }
  for (const [plan, id] of Object.entries(FALLBACK_PRICE_IDS) as Array<[PlanId, string]>) {
    if (id === priceId) return plan;
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
