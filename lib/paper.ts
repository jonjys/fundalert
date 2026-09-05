import { randomUUID } from "node:crypto";
import { CARD_FLIP_PCT, CARD_THRESHOLD_PCT, PAPER_HORIZON_MS, PAPER_RULE, PAPER_WINDOW_DAYS } from "./config";
import { buildTradeCards, collapseLevelPct } from "./cards";
import {
  insertPaperPosition,
  listOpenPaperPositions,
  listPaperSince,
  updatePaperSettlement,
} from "./store";
import type { FundingRate, PaperOutcome, PaperPosition, PaperTrackSummary, TradeCard } from "./types";

export function paperRule(): string {
  return PAPER_RULE;
}

function rateKey(exchange: string, symbol: string): string {
  return `${exchange}:${symbol}`;
}

export function markPaperOutcome(
  pos: PaperPosition,
  later: FundingRate | null,
): { outcome: PaperOutcome; exitFundingRatePct: number | null; pnlPct: number } {
  const hours = pos.intervalHours > 0 ? pos.intervalHours : 8;
  const intervals = PAPER_HORIZON_MS / (hours * 3_600_000);
  const carryEquityPct = Math.abs(pos.fundingRatePct) * intervals * (pos.sizePct / 100);

  if (!later) {
    return { outcome: "expired", exitFundingRatePct: null, pnlPct: 0 };
  }

  const laterPct = later.fundingRatePct;
  const issued = pos.fundingRatePct;
  const sameSign = (laterPct > 0 && issued > 0) || (laterPct < 0 && issued < 0);
  const flippedPast = !sameSign && Math.abs(laterPct) >= CARD_FLIP_PCT;
  const collapsed = Math.abs(laterPct) < collapseLevelPct(Math.abs(issued));

  if (flippedPast) {
    return { outcome: "lose", exitFundingRatePct: laterPct, pnlPct: -carryEquityPct };
  }
  if (collapsed) {
    return { outcome: "flat", exitFundingRatePct: laterPct, pnlPct: 0 };
  }
  if (sameSign) {
    return { outcome: "win", exitFundingRatePct: laterPct, pnlPct: carryEquityPct };
  }
  return { outcome: "flat", exitFundingRatePct: laterPct, pnlPct: 0 };
}

function cardToPosition(card: TradeCard, now: number): PaperPosition {
  return {
    id: randomUUID(),
    symbol: card.symbol,
    exchange: card.exchange,
    side: card.side,
    fundingRatePct: card.fundingRatePct,
    intervalHours: card.intervalHours,
    sizePct: card.sizePct,
    confidence: card.confidence,
    issuedAt: now,
    settleAt: now + PAPER_HORIZON_MS,
    settledAt: null,
    exitFundingRatePct: null,
    outcome: null,
    pnlPct: null,
  };
}

export async function syncPaperBook(rates: FundingRate[]): Promise<{
  issued: PaperPosition[];
  settled: PaperPosition[];
}> {
  const now = Date.now();
  const byKey = new Map(rates.map((row) => [rateKey(row.exchange, row.symbol), row]));
  const open = await listOpenPaperPositions();
  const settled: PaperPosition[] = [];

  for (const pos of open) {
    if (pos.settleAt > now) continue;
    const later = byKey.get(rateKey(pos.exchange, pos.symbol)) ?? null;
    const mark = markPaperOutcome(pos, later);
    const next = await updatePaperSettlement(pos.id, {
      settledAt: now,
      exitFundingRatePct: mark.exitFundingRatePct,
      outcome: mark.outcome,
      pnlPct: mark.pnlPct,
    });
    if (next) settled.push(next);
  }

  const stillOpen = new Set(
    (await listOpenPaperPositions()).map((row) => rateKey(row.exchange, row.symbol)),
  );
  const issued: PaperPosition[] = [];
  const cards = buildTradeCards(rates, { thresholdPct: CARD_THRESHOLD_PCT, max: 12, now });

  for (const card of cards) {
    if (!card.extreme) continue;
    const key = rateKey(card.exchange, card.symbol);
    if (stillOpen.has(key)) continue;
    const row = await insertPaperPosition(cardToPosition(card, now));
    stillOpen.add(key);
    issued.push(row);
  }

  return { issued, settled };
}

export function emptyPaperTrack(rule = PAPER_RULE): PaperTrackSummary {
  return {
    windowDays: PAPER_WINDOW_DAYS,
    rule,
    issued: 0,
    settled: 0,
    wins: 0,
    losses: 0,
    flats: 0,
    expired: 0,
    winRate: null,
    sumPnlPct: null,
    rows: [],
  };
}

export async function getPaperTrackSafe(): Promise<PaperTrackSummary> {
  try {
    return await getPaperTrack();
  } catch {
    return emptyPaperTrack("Paper store unavailable in this environment.");
  }
}

export async function getPaperTrack(now = Date.now()): Promise<PaperTrackSummary> {
  const since = now - PAPER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const rows = await listPaperSince(since);
  const settledRows = rows.filter((row) => row.outcome !== null);
  const wins = settledRows.filter((row) => row.outcome === "win").length;
  const losses = settledRows.filter((row) => row.outcome === "lose").length;
  const flats = settledRows.filter((row) => row.outcome === "flat").length;
  const expired = settledRows.filter((row) => row.outcome === "expired").length;
  const decided = wins + losses;
  const pnlValues = settledRows
    .map((row) => row.pnlPct)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    windowDays: PAPER_WINDOW_DAYS,
    rule: PAPER_RULE,
    issued: rows.length,
    settled: settledRows.length,
    wins,
    losses,
    flats,
    expired,
    winRate: decided > 0 ? (wins / decided) * 100 : null,
    sumPnlPct: pnlValues.length > 0 ? pnlValues.reduce((sum, n) => sum + n, 0) : null,
    rows,
  };
}
