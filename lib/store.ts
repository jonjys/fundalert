import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { newReferralCode } from "./codes";
import type {
  Confidence,
  Entitlement,
  ExchangeId,
  GiftCode,
  PaperOutcome,
  PaperPosition,
  PlanId,
  TradeSide,
} from "./types";

type StoreFile = {
  entitlements: Entitlement[];
  giftCodes: GiftCode[];
  paperPositions: PaperPosition[];
};

const FILE_PATH =
  process.env.STORE_PATH ||
  (process.env.VERCEL? "/tmp/fundalert-store.json" : path.join(process.cwd(), "data", "store.json"));

let writeChain: Promise<void> = Promise.resolve();
let libsql: Client | null = null;
let libsqlReady = false;

function tursoEnabled(): boolean {
  const url = process.env.TURSO_DATABASE_URL;
  return Boolean(url &&!url.startsWith("file:"));
}

function serialize(row: Entitlement): Entitlement {
  return {
   ...row,
    telegramEnabled: Boolean(row.telegramEnabled),
    telegramWatchlist: (row as any).telegramWatchlist?? null,
    referralCode: row.referralCode?? null,
    referredBy: row.referredBy?? null,
    referralRewardsGranted: row.referralRewardsGranted?? 0,
  };
}

async function readFileStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      entitlements: (parsed.entitlements?? []).map(serialize),
      giftCodes: parsed.giftCodes?? [],
      paperPositions: (parsed.paperPositions ?? []).map(serializePaper),
    };
  } catch {
    return { entitlements: [], giftCodes: [], paperPositions: [] };
  }
}

async function writeFileStore(data: StoreFile): Promise<void> {
  await mkdir(path.dirname(FILE_PATH), { recursive: true });
  const tmp = `${FILE_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(() => undefined, () => undefined);
  return run;
}

async function turso(): Promise<Client> {
  if (libsql) return libsql;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  libsql = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  if (!libsqlReady) {
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS entitlements (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        plan TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        stripe_session_id TEXT UNIQUE,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        expires_at INTEGER,
        created_at INTEGER NOT NULL,
        telegram_chat_id TEXT,
        telegram_threshold_pct REAL NOT NULL DEFAULT 0.05,
        telegram_enabled INTEGER NOT NULL DEFAULT 0,
        telegram_watchlist TEXT,
        last_alert_at INTEGER,
        last_alert_key TEXT,
        referral_code TEXT,
        referred_by TEXT,
        referral_rewards_granted INTEGER NOT NULL DEFAULT 0
      )
    `);
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS gift_codes (
        id TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL UNIQUE,
        stripe_session_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        email TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        redeemed_at INTEGER
      )
    `);
    for (const stmt of [
      "ALTER TABLE entitlements ADD COLUMN referral_code TEXT",
      "ALTER TABLE entitlements ADD COLUMN referred_by TEXT",
      "ALTER TABLE entitlements ADD COLUMN referral_rewards_granted INTEGER NOT NULL DEFAULT 0",
      "ALTER TABLE entitlements ADD COLUMN telegram_watchlist TEXT",
    ]) {
      try { await libsql.execute(stmt); } catch {}
    }
    try {
      await libsql.execute("CREATE UNIQUE INDEX IF NOT EXISTS entitlements_referral_code ON entitlements(referral_code)");
    } catch {}
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS paper_positions (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        exchange TEXT NOT NULL,
        side TEXT NOT NULL,
        funding_rate_pct REAL NOT NULL,
        interval_hours REAL NOT NULL,
        size_pct REAL NOT NULL,
        confidence TEXT NOT NULL,
        issued_at INTEGER NOT NULL,
        settle_at INTEGER NOT NULL,
        settled_at INTEGER,
        exit_funding_rate_pct REAL,
        outcome TEXT,
        pnl_pct REAL
      )
    `);
    try {
      await libsql.execute("CREATE INDEX IF NOT EXISTS paper_positions_issued ON paper_positions(issued_at)");
    } catch {}
    libsqlReady = true;
  }
  return libsql;
}

function rowToEntitlement(row: Record<string, unknown>): Entitlement {
  return serialize({
    id: String(row.id),
    email: String(row.email),
    plan: row.plan as PlanId,
    tokenHash: String(row.token_hash),
    stripeSessionId: String(row.stripe_session_id?? ""),
    stripeCustomerId: row.stripe_customer_id? String(row.stripe_customer_id) : null,
    stripeSubscriptionId: row.stripe_subscription_id? String(row.stripe_subscription_id) : null,
    expiresAt: row.expires_at == null? null : Number(row.expires_at),
    createdAt: Number(row.created_at),
    telegramChatId: row.telegram_chat_id? String(row.telegram_chat_id) : null,
    telegramThresholdPct: Number(row.telegram_threshold_pct?? 0.05),
    telegramEnabled: Boolean(Number(row.telegram_enabled)),
    telegramWatchlist: row.telegram_watchlist? String(row.telegram_watchlist) : null,
    lastAlertAt: row.last_alert_at == null? null : Number(row.last_alert_at),
    lastAlertKey: row.last_alert_key? String(row.last_alert_key) : null,
    referralCode: row.referral_code? String(row.referral_code) : null,
    referredBy: row.referred_by? String(row.referred_by) : null,
    referralRewardsGranted: Number(row.referral_rewards_granted?? 0),
  } as any);
}

function rowToGift(row: Record<string, unknown>): GiftCode {
  return {
    id: String(row.id), codeHash: String(row.code_hash), stripeSessionId: String(row.stripe_session_id),
    plan: row.plan as PlanId, email: String(row.email), expiresAt: Number(row.expires_at),
    createdAt: Number(row.created_at), redeemedAt: row.redeemed_at == null? null : Number(row.redeemed_at),
  };
}

function isTradeSide(value: unknown): value is TradeSide {
  return value === "long" || value === "short";
}

function isConfidence(value: unknown): value is Confidence {
  return value === "low" || value === "med" || value === "high";
}

function isPaperOutcome(value: unknown): value is PaperOutcome {
  return value === "win" || value === "lose" || value === "flat" || value === "expired";
}

function isExchangeId(value: unknown): value is ExchangeId {
  return value === "binance" || value === "bybit" || value === "okx";
}

function serializePaper(row: PaperPosition): PaperPosition {
  return {
    id: row.id,
    symbol: row.symbol,
    exchange: isExchangeId(row.exchange) ? row.exchange : "binance",
    side: isTradeSide(row.side) ? row.side : "long",
    fundingRatePct: Number(row.fundingRatePct),
    intervalHours: Number(row.intervalHours),
    sizePct: Number(row.sizePct),
    confidence: isConfidence(row.confidence) ? row.confidence : "low",
    issuedAt: Number(row.issuedAt),
    settleAt: Number(row.settleAt),
    settledAt: row.settledAt == null ? null : Number(row.settledAt),
    exitFundingRatePct: row.exitFundingRatePct == null ? null : Number(row.exitFundingRatePct),
    outcome: isPaperOutcome(row.outcome) ? row.outcome : null,
    pnlPct: row.pnlPct == null ? null : Number(row.pnlPct),
  };
}

function rowToPaper(row: Record<string, unknown>): PaperPosition {
  return serializePaper({
    id: String(row.id),
    symbol: String(row.symbol),
    exchange: isExchangeId(row.exchange) ? row.exchange : "binance",
    side: isTradeSide(row.side) ? row.side : "long",
    fundingRatePct: Number(row.funding_rate_pct),
    intervalHours: Number(row.interval_hours),
    sizePct: Number(row.size_pct),
    confidence: isConfidence(row.confidence) ? row.confidence : "low",
    issuedAt: Number(row.issued_at),
    settleAt: Number(row.settle_at),
    settledAt: row.settled_at == null ? null : Number(row.settled_at),
    exitFundingRatePct: row.exit_funding_rate_pct == null ? null : Number(row.exit_funding_rate_pct),
    outcome: isPaperOutcome(row.outcome) ? row.outcome : null,
    pnlPct: row.pnl_pct == null ? null : Number(row.pnl_pct),
  });
}

export async function upsertEntitlement(row: Entitlement): Promise<Entitlement> {
  const next = serialize(row);
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({
      sql: `INSERT INTO entitlements (id, email, plan, token_hash, stripe_session_id, stripe_customer_id, stripe_subscription_id, expires_at, created_at, telegram_chat_id, telegram_threshold_pct, telegram_enabled, telegram_watchlist, last_alert_at, last_alert_key, referral_code, referred_by, referral_rewards_granted) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(stripe_session_id) DO UPDATE SET email=excluded.email, plan=excluded.plan, token_hash=excluded.token_hash, stripe_customer_id=excluded.stripe_customer_id, stripe_subscription_id=excluded.stripe_subscription_id, expires_at=excluded.expires_at, referral_code=COALESCE(entitlements.referral_code, excluded.referral_code), referred_by=COALESCE(entitlements.referred_by, excluded.referred_by)`,
      args: [next.id, next.email, next.plan, next.tokenHash, next.stripeSessionId, next.stripeCustomerId, next.stripeSubscriptionId, next.expiresAt, next.createdAt, next.telegramChatId, next.telegramThresholdPct, next.telegramEnabled? 1 : 0, (next as any).telegramWatchlist?? null, next.lastAlertAt, next.lastAlertKey, next.referralCode, next.referredBy, next.referralRewardsGranted],
    });
    return (await getEntitlementBySession(next.stripeSessionId))?? next;
  }
  return enqueue(async () => {
    const data = await readFileStore();
    const idx = data.entitlements.findIndex((e) => e.stripeSessionId === next.stripeSessionId);
    if (idx >= 0) {
      const prev = data.entitlements[idx];
      data.entitlements[idx] = {...prev, email: next.email, plan: next.plan, tokenHash: next.tokenHash, stripeCustomerId: next.stripeCustomerId, stripeSubscriptionId: next.stripeSubscriptionId, expiresAt: next.expiresAt, referralCode: prev.referralCode?? next.referralCode, referredBy: prev.referredBy?? next.referredBy };
    } else { data.entitlements.push(next); }
    await writeFileStore(data);
    return idx >= 0? data.entitlements[idx] : next;
  });
}

export async function getEntitlementBySession(sessionId: string): Promise<Entitlement | null> {
  if (tursoEnabled()) {
    const db = await turso();
    const rs = await db.execute({ sql: "SELECT * FROM entitlements WHERE stripe_session_id =? LIMIT 1", args: [sessionId] });
    const row = rs.rows[0] as any; return row? rowToEntitlement(row) : null;
  }
  const data = await readFileStore();
  return data.entitlements.find((e) => e.stripeSessionId === sessionId)?? null;
}

export async function getEntitlementByTokenHash(tokenHash: string): Promise<Entitlement | null> {
  if (tursoEnabled()) {
    const db = await turso();
    const rs = await db.execute({ sql: "SELECT * FROM entitlements WHERE token_hash =? ORDER BY created_at DESC LIMIT 1", args: [tokenHash] });
    const row = rs.rows[0] as any; return row? rowToEntitlement(row) : null;
  }
  const data = await readFileStore();
  return data.entitlements.find((e) => e.tokenHash === tokenHash)?? null;
}

export async function updateTelegramSettings(input: { stripeSessionId: string; telegramChatId: string | null; telegramThresholdPct: number; telegramEnabled: boolean; }): Promise<Entitlement | null> {
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({ sql: `UPDATE entitlements SET telegram_chat_id =?, telegram_threshold_pct =?, telegram_enabled =? WHERE stripe_session_id =?`, args: [input.telegramChatId, input.telegramThresholdPct, input.telegramEnabled? 1 : 0, input.stripeSessionId] });
    return getEntitlementBySession(input.stripeSessionId);
  }
  return enqueue(async () => {
    const data = await readFileStore();
    const idx = data.entitlements.findIndex((e) => e.stripeSessionId === input.stripeSessionId);
    if (idx < 0) return null;
    data.entitlements[idx] = {...data.entitlements[idx], telegramChatId: input.telegramChatId, telegramThresholdPct: input.telegramThresholdPct, telegramEnabled: input.telegramEnabled };
    await writeFileStore(data); return data.entitlements[idx];
  });
}

export async function listAlertSubscribers(): Promise<Entitlement[]> {
  const now = Date.now();
  if (tursoEnabled()) {
    const db = await turso();
    const rs = await db.execute({ sql: `SELECT * FROM entitlements WHERE telegram_enabled = 1 AND telegram_chat_id IS NOT NULL AND (expires_at IS NULL OR expires_at >?)`, args: [now] });
    return rs.rows.map((row) => rowToEntitlement(row as any));
  }
  const data = await readFileStore();
  return data.entitlements.filter((e) => e.telegramEnabled && e.telegramChatId && (e.expiresAt === null || e.expiresAt > now));
}

export async function markAlertSent(stripeSessionId: string, lastAlertKey: string): Promise<void> {
  const now = Date.now();
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({ sql: "UPDATE entitlements SET last_alert_at =?, last_alert_key =? WHERE stripe_session_id =?", args: [now, lastAlertKey, stripeSessionId] }); return;
  }
  await enqueue(async () => {
    const data = await readFileStore();
    const idx = data.entitlements.findIndex((e) => e.stripeSessionId === stripeSessionId);
    if (idx < 0) return;
    data.entitlements[idx] = {...data.entitlements[idx], lastAlertAt: now, lastAlertKey };
    await writeFileStore(data);
  });
}

export async function expireBySubscription(subscriptionId: string): Promise<void> {
  const now = Date.now();
  if (tursoEnabled()) { const db = await turso(); await db.execute({ sql: "UPDATE entitlements SET expires_at =? WHERE stripe_subscription_id =?", args: [now, subscriptionId] }); return; }
  await enqueue(async () => {
    const data = await readFileStore();
    data.entitlements = data.entitlements.map((e) => e.stripeSubscriptionId === subscriptionId? {...e, expiresAt: now } : e);
    await writeFileStore(data);
  });
}

export async function extendBySubscription(subscriptionId: string, expiresAt: number): Promise<void> {
  if (tursoEnabled()) { const db = await turso(); await db.execute({ sql: "UPDATE entitlements SET expires_at =? WHERE stripe_subscription_id =?", args: [expiresAt, subscriptionId] }); return; }
  await enqueue(async () => {
    const data = await readFileStore();
    data.entitlements = data.entitlements.map((e) => e.stripeSubscriptionId === subscriptionId? {...e, expiresAt } : e);
    await writeFileStore(data);
  });
}

export function storeBackend(): "turso" | "json-file" { return tursoEnabled()? "turso" : "json-file"; }

export async function getEntitlementByReferralCode(referralCode: string): Promise<Entitlement | null> {
  const code = referralCode.trim().toUpperCase(); if (!code) return null;
  if (tursoEnabled()) { const db = await turso(); const rs = await db.execute({ sql: "SELECT * FROM entitlements WHERE referral_code =? LIMIT 1", args: [code] }); const row = rs.rows[0] as any; return row? rowToEntitlement(row) : null; }
  const data = await readFileStore(); return data.entitlements.find((e) => e.referralCode === code)?? null;
}

export async function ensureReferralCode(stripeSessionId: string): Promise<string | null> {
  const existing = await getEntitlementBySession(stripeSessionId); if (!existing) return null; if (existing.referralCode) return existing.referralCode;
  for (let attempt = 0; attempt < 6; attempt += 1) { const code = newReferralCode(); const taken = await getEntitlementByReferralCode(code); if (taken) continue; const updated = await patchEntitlement(stripeSessionId, { referralCode: code }); return updated?.referralCode?? code; }
  return null;
}

export async function patchEntitlement(stripeSessionId: string, fields: Partial<Pick<Entitlement, "expiresAt" | "tokenHash" | "referralCode" | "referredBy" | "referralRewardsGranted">>): Promise<Entitlement | null> {
  if (tursoEnabled()) {
    const current = await getEntitlementBySession(stripeSessionId); if (!current) return null; const next = {...current,...fields };
    const db = await turso();
    await db.execute({ sql: `UPDATE entitlements SET expires_at =?, token_hash =?, referral_code =?, referred_by =?, referral_rewards_granted =? WHERE stripe_session_id =?`, args: [next.expiresAt, next.tokenHash, next.referralCode, next.referredBy, next.referralRewardsGranted, stripeSessionId] });
    return getEntitlementBySession(stripeSessionId);
  }
  return enqueue(async () => {
    const data = await readFileStore(); const idx = data.entitlements.findIndex((e) => e.stripeSessionId === stripeSessionId); if (idx < 0) return null;
    data.entitlements[idx] = {...data.entitlements[idx],...fields }; await writeFileStore(data); return data.entitlements[idx];
  });
}

export async function insertGiftCode(row: GiftCode): Promise<GiftCode> {
  if (tursoEnabled()) {
    const db = await turso(); await db.execute({ sql: `UPDATE gift_codes SET redeemed_at =? WHERE stripe_session_id =? AND redeemed_at IS NULL`, args: [Date.now(), row.stripeSessionId] });
    await db.execute({ sql: `INSERT INTO gift_codes (id, code_hash, stripe_session_id, plan, email, expires_at, created_at, redeemed_at) VALUES (?,?,?,?,?,?,?,?)`, args: [row.id, row.codeHash, row.stripeSessionId, row.plan, row.email, row.expiresAt, row.createdAt, row.redeemedAt] }); return row;
  }
  return enqueue(async () => {
    const data = await readFileStore(); const now = Date.now();
    data.giftCodes = data.giftCodes.map((g) => g.stripeSessionId === row.stripeSessionId && g.redeemedAt == null? {...g, redeemedAt: now } : g);
    data.giftCodes.push(row); await writeFileStore(data); return row;
  });
}

export async function getGiftByHash(codeHash: string): Promise<GiftCode | null> {
  if (tursoEnabled()) { const db = await turso(); const rs = await db.execute({ sql: "SELECT * FROM gift_codes WHERE code_hash =? LIMIT 1", args: [codeHash] }); const row = rs.rows[0] as any; return row? rowToGift(row) : null; }
  const data = await readFileStore(); return data.giftCodes.find((g) => g.codeHash === codeHash)?? null;
}

export async function markGiftRedeemed(codeHash: string): Promise<GiftCode | null> {
  const now = Date.now();
  if (tursoEnabled()) { const db = await turso(); await db.execute({ sql: "UPDATE gift_codes SET redeemed_at =? WHERE code_hash =? AND redeemed_at IS NULL", args: [now, codeHash] }); return getGiftByHash(codeHash); }
  return enqueue(async () => {
    const data = await readFileStore(); const idx = data.giftCodes.findIndex((g) => g.codeHash === codeHash); if (idx < 0) return null; if (data.giftCodes[idx].redeemedAt) return data.giftCodes[idx];
    data.giftCodes[idx] = {...data.giftCodes[idx], redeemedAt: now }; await writeFileStore(data); return data.giftCodes[idx];
  });
}

// NYA FUNKTIONER FÖR BNCUSDT LÅS
export async function setTelegramWatchlistByChatId(chatId: string, watchlist: string) {
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({ sql: "UPDATE entitlements SET telegram_watchlist =? WHERE telegram_chat_id =?", args: [watchlist, chatId] });
    return;
  }
  await enqueue(async () => {
    const data = await readFileStore();
    const idx = data.entitlements.findIndex(e => e.telegramChatId === chatId);
    if (idx >= 0) { (data.entitlements[idx] as any).telegramWatchlist = watchlist; await writeFileStore(data); }
  });
}

export async function insertPaperPosition(row: PaperPosition): Promise<PaperPosition> {
  const next = serializePaper(row);
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({
      sql: `INSERT INTO paper_positions (id, symbol, exchange, side, funding_rate_pct, interval_hours, size_pct, confidence, issued_at, settle_at, settled_at, exit_funding_rate_pct, outcome, pnl_pct) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        next.id,
        next.symbol,
        next.exchange,
        next.side,
        next.fundingRatePct,
        next.intervalHours,
        next.sizePct,
        next.confidence,
        next.issuedAt,
        next.settleAt,
        next.settledAt,
        next.exitFundingRatePct,
        next.outcome,
        next.pnlPct,
      ],
    });
    return next;
  }
  return enqueue(async () => {
    const data = await readFileStore();
    data.paperPositions.push(next);
    await writeFileStore(data);
    return next;
  });
}

export async function listOpenPaperPositions(): Promise<PaperPosition[]> {
  if (tursoEnabled()) {
    const db = await turso();
    const rs = await db.execute({
      sql: "SELECT * FROM paper_positions WHERE settled_at IS NULL ORDER BY issued_at DESC",
      args: [],
    });
    return rs.rows.map((row) => rowToPaper(row as Record<string, unknown>));
  }
  const data = await readFileStore();
  return data.paperPositions.filter((row) => row.settledAt == null);
}

export async function listPaperSince(since: number): Promise<PaperPosition[]> {
  if (tursoEnabled()) {
    const db = await turso();
    const rs = await db.execute({
      sql: "SELECT * FROM paper_positions WHERE issued_at >= ? ORDER BY issued_at DESC LIMIT 80",
      args: [since],
    });
    return rs.rows.map((row) => rowToPaper(row as Record<string, unknown>));
  }
  const data = await readFileStore();
  return data.paperPositions
    .filter((row) => row.issuedAt >= since)
    .sort((a, b) => b.issuedAt - a.issuedAt)
    .slice(0, 80);
}

export async function updatePaperSettlement(
  id: string,
  fields: {
    settledAt: number;
    exitFundingRatePct: number | null;
    outcome: PaperOutcome;
    pnlPct: number;
  },
): Promise<PaperPosition | null> {
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({
      sql: "UPDATE paper_positions SET settled_at =?, exit_funding_rate_pct =?, outcome =?, pnl_pct =? WHERE id =?",
      args: [fields.settledAt, fields.exitFundingRatePct, fields.outcome, fields.pnlPct, id],
    });
    const rs = await db.execute({ sql: "SELECT * FROM paper_positions WHERE id =? LIMIT 1", args: [id] });
    const row = rs.rows[0] as Record<string, unknown> | undefined;
    return row ? rowToPaper(row) : null;
  }
  return enqueue(async () => {
    const data = await readFileStore();
    const idx = data.paperPositions.findIndex((row) => row.id === id);
    if (idx < 0) return null;
    data.paperPositions[idx] = {
      ...data.paperPositions[idx],
      settledAt: fields.settledAt,
      exitFundingRatePct: fields.exitFundingRatePct,
      outcome: fields.outcome,
      pnlPct: fields.pnlPct,
    };
    await writeFileStore(data);
    return data.paperPositions[idx];
  });
}
