import {
  CARD_COLLAPSE_RATIO,
  CARD_DISCLAIMER,
  CARD_FLIP_PCT,
  CARD_SIZE_MAX_PCT,
  CARD_SIZE_MIN_PCT,
  CARD_THRESHOLD_PCT,
} from "./config";
import type { Confidence, FundingRate, TradeCard, TradeSide } from "./types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function matchesWatchlist(symbol: string, watchlist: string | null | undefined): boolean {
  if (!watchlist || watchlist.trim() === "" || watchlist.toUpperCase() === "ALL") {
    return true;
  }
  const tokens = watchlist
    .toUpperCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const upper = symbol.toUpperCase();
  return tokens.some((token) => upper.includes(token));
}

export function confidenceFromMagnitude(absPct: number): Confidence {
  if (absPct >= 0.15) return "high";
  if (absPct >= 0.08) return "med";
  return "low";
}

/**
 * Conservative % of equity. 5% at the extreme threshold, linear to 15% by |funding| 0.20%.
 */
export function suggestedSizePct(absPct: number): number {
  const span = 0.2 - CARD_THRESHOLD_PCT;
  const t = span <= 0 ? 0 : (absPct - CARD_THRESHOLD_PCT) / span;
  return Math.round(clamp(CARD_SIZE_MIN_PCT + t * (CARD_SIZE_MAX_PCT - CARD_SIZE_MIN_PCT), CARD_SIZE_MIN_PCT, CARD_SIZE_MAX_PCT));
}

export function collapseLevelPct(issuedAbsPct: number): number {
  return Math.max(CARD_THRESHOLD_PCT, issuedAbsPct * CARD_COLLAPSE_RATIO);
}

function entryNote(nextFundingTime: number | null, now: number): string {
  if (!nextFundingTime) return "Market / wait for next funding window.";
  const ms = nextFundingTime - now;
  if (ms > 0 && ms < 30 * 60 * 1000) {
    return "Wait for next funding window — this print is imminent.";
  }
  return "Market — hold through the next funding print to collect carry.";
}

function invalidationText(side: TradeSide, collapsePct: number): string {
  const flip = CARD_FLIP_PCT.toFixed(2);
  const collapse = collapsePct.toFixed(3);
  if (side === "short") {
    return `Invalidate if funding flips below +${flip}% or |rate| collapses under ${collapse}%.`;
  }
  return `Invalidate if funding flips above −${flip}% or |rate| collapses under ${collapse}%.`;
}

export function cardFromRate(row: FundingRate, now = Date.now()): TradeCard {
  const absPct = Math.abs(row.fundingRatePct);
  const side: TradeSide = row.fundingRatePct > 0 ? "short" : "long";
  const collapsePct = collapseLevelPct(absPct);
  const hours = row.intervalHours > 0 ? row.intervalHours : 8;
  const expected24hPct = row.fundingRatePct * (24 / hours);

  return {
    id: `${row.exchange}:${row.symbol}`,
    exchange: row.exchange,
    symbol: row.symbol,
    base: row.base,
    quote: row.quote,
    fundingRatePct: row.fundingRatePct,
    annualizedPct: row.annualizedPct,
    expected24hPct,
    markPrice: row.markPrice,
    nextFundingTime: row.nextFundingTime,
    intervalHours: hours,
    side,
    biasLabel:
      side === "short"
        ? "Short perps — longs pay you (positive funding)"
        : "Long perps — shorts pay you (negative funding)",
    sizePct: suggestedSizePct(absPct),
    entryNote: entryNote(row.nextFundingTime, now),
    invalidation: invalidationText(side, collapsePct),
    collapsePct,
    flipPct: CARD_FLIP_PCT,
    confidence: confidenceFromMagnitude(absPct),
    extreme: absPct >= CARD_THRESHOLD_PCT,
    disclaimer: CARD_DISCLAIMER,
  };
}

export function buildTradeCards(
  rates: FundingRate[],
  opts?: {
    thresholdPct?: number;
    max?: number;
    includeBelowThreshold?: boolean;
    now?: number;
  },
): TradeCard[] {
  const threshold = opts?.thresholdPct ?? CARD_THRESHOLD_PCT;
  const now = opts?.now ?? Date.now();
  const sorted = [...rates].sort(
    (a, b) => Math.abs(b.fundingRatePct) - Math.abs(a.fundingRatePct),
  );
  const picked = opts?.includeBelowThreshold
    ? sorted
    : sorted.filter((row) => Math.abs(row.fundingRatePct) >= threshold);
  const limited = typeof opts?.max === "number" ? picked.slice(0, opts.max) : picked;
  return limited.map((row) => cardFromRate(row, now));
}
