export type PlanId = "trial" | "weekly" | "pro" | "lifetime";

export const PLAN_IDS: readonly PlanId[] = ["trial", "weekly", "pro", "lifetime"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export type ExchangeId = "binance" | "bybit" | "okx";

export type SourceStatus = "ok" | "error" | "skipped";

export type FundingRate = {
  exchange: ExchangeId;
  symbol: string;
  base: string;
  quote: string;
  fundingRate: number;
  fundingRatePct: number;
  markPrice: number | null;
  nextFundingTime: number | null;
  intervalHours: number;
  annualizedPct: number;
};

export type RatesPayload = {
  fetchedAt: string;
  limited: boolean;
  freeLimit: number;
  sources: Record<ExchangeId, SourceStatus>;
  errors: Partial<Record<ExchangeId, string>>;
  rates: FundingRate[];
};

export type Entitlement = {
  id: string;
  email: string;
  plan: PlanId;
  tokenHash: string;
  stripeSessionId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  expiresAt: number | null;
  createdAt: number;
  telegramChatId: string | null;
  telegramThresholdPct: number;
  telegramEnabled: boolean;
  lastAlertAt: number | null;
  lastAlertKey: string | null;
  referralCode: string | null;
  referredBy: string | null;
  referralRewardsGranted: number;
};

export type GiftCode = {
  id: string;
  codeHash: string;
  stripeSessionId: string;
  plan: PlanId;
  email: string;
  expiresAt: number;
  createdAt: number;
  redeemedAt: number | null;
};

export type AccessState = {
  ok: boolean;
  plan: PlanId | "free";
  email: string | null;
  expiresAt: number | null;
  token: string | null;
};

export type TokenPayload = {
  v: 1;
  email: string;
  plan: PlanId;
  exp: number | null;
  sid: string;
};
