import assert from "node:assert/strict";
import { cardFromRate, confidenceFromMagnitude, suggestedSizePct } from "./cards";
import { markPaperOutcome } from "./paper";
import type { FundingRate, PaperPosition } from "./types";

const sample: FundingRate = {
  exchange: "binance",
  symbol: "BTCUSDT",
  base: "BTC",
  quote: "USDT",
  fundingRate: 0.0012,
  fundingRatePct: 0.12,
  markPrice: 100,
  nextFundingTime: Date.now() + 3 * 60 * 60 * 1000,
  intervalHours: 8,
  annualizedPct: 131.4,
};

const card = cardFromRate(sample, Date.now());
assert.equal(card.side, "short");
assert.equal(card.extreme, true);
assert.equal(card.confidence, "med");
assert.equal(suggestedSizePct(0.05), 5);
assert.equal(suggestedSizePct(0.2), 15);
assert.equal(confidenceFromMagnitude(0.2), "high");
assert.ok(card.expected24hPct > 0);
assert.ok(card.invalidation.includes("flips below"));

const longCard = cardFromRate({ ...sample, fundingRate: -0.002, fundingRatePct: -0.2 });
assert.equal(longCard.side, "long");
assert.equal(longCard.confidence, "high");

const pos: PaperPosition = {
  id: "t1",
  symbol: "BTCUSDT",
  exchange: "binance",
  side: "short",
  fundingRatePct: 0.12,
  intervalHours: 8,
  sizePct: 10,
  confidence: "med",
  issuedAt: 1,
  settleAt: 2,
  settledAt: null,
  exitFundingRatePct: null,
  outcome: null,
  pnlPct: null,
};

assert.equal(markPaperOutcome(pos, { ...sample, fundingRatePct: 0.11 }).outcome, "win");
assert.equal(markPaperOutcome(pos, { ...sample, fundingRatePct: -0.05 }).outcome, "lose");
assert.equal(markPaperOutcome(pos, { ...sample, fundingRatePct: 0.01 }).outcome, "flat");
assert.equal(markPaperOutcome(pos, null).outcome, "expired");

console.log("cards-math.test.ts ok");
