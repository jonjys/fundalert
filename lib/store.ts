import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import type { Entitlement, PlanId } from "./types";

type StoreFile = { entitlements: Entitlement[] };

const FILE_PATH =
  process.env.STORE_PATH ||
  (process.env.VERCEL ? "/tmp/fundalert-store.json" : path.join(process.cwd(), "data", "store.json"));

let writeChain: Promise<void> = Promise.resolve();
let libsql: Client | null = null;
let libsqlReady = false;

function tursoEnabled(): boolean {
  const url = process.env.TURSO_DATABASE_URL;
  return Boolean(url && !url.startsWith("file:"));
}

function serialize(row: Entitlement): Entitlement {
  return {
    ...row,
    telegramEnabled: Boolean(row.telegramEnabled),
  };
}

async function readFileStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    return { entitlements: parsed.entitlements ?? [] };
  } catch {
    return { entitlements: [] };
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
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function turso(): Promise<Client> {
  if (libsql) return libsql;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  libsql = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
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
        last_alert_at INTEGER,
        last_alert_key TEXT
      )
    `);
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
    stripeSessionId: String(row.stripe_session_id ?? ""),
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : null,
    stripeSubscriptionId: row.stripe_subscription_id
      ? String(row.stripe_subscription_id)
      : null,
    expiresAt: row.expires_at == null ? null : Number(row.expires_at),
    createdAt: Number(row.created_at),
    telegramChatId: row.telegram_chat_id ? String(row.telegram_chat_id) : null,
    telegramThresholdPct: Number(row.telegram_threshold_pct ?? 0.05),
    telegramEnabled: Boolean(Number(row.telegram_enabled)),
    lastAlertAt: row.last_alert_at == null ? null : Number(row.last_alert_at),
    lastAlertKey: row.last_alert_key ? String(row.last_alert_key) : null,
  });
}

export async function upsertEntitlement(row: Entitlement): Promise<Entitlement> {
  const next = serialize(row);
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({
      sql: `
        INSERT INTO entitlements (
          id, email, plan, token_hash, stripe_session_id, stripe_customer_id,
          stripe_subscription_id, expires_at, created_at, telegram_chat_id,
          telegram_threshold_pct, telegram_enabled, last_alert_at, last_alert_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(stripe_session_id) DO UPDATE SET
          email=excluded.email,
          plan=excluded.plan,
          token_hash=excluded.token_hash,
          stripe_customer_id=excluded.stripe_customer_id,
          stripe_subscription_id=excluded.stripe_subscription_id,
          expires_at=excluded.expires_at
      `,
      args: [
        next.id,
        next.email,
        next.plan,
        next.tokenHash,
        next.stripeSessionId,
        next.stripeCustomerId,
        next.stripeSubscriptionId,
        next.expiresAt,
        next.createdAt,
        next.telegramChatId,
        next.telegramThresholdPct,
        next.telegramEnabled ? 1 : 0,
        next.lastAlertAt,
        next.lastAlertKey,
      ],
    });
    return next;
  }

  return enqueue(async () => {
    const data = await readFileStore();
    const idx = data.entitlements.findIndex((e) => e.stripeSessionId === next.stripeSessionId);
    if (idx >= 0) {
      data.entitlements[idx] = {
        ...data.entitlements[idx],
        email: next.email,
        plan: next.plan,
        tokenHash: next.tokenHash,
        stripeCustomerId: next.stripeCustomerId,
        stripeSubscriptionId: next.stripeSubscriptionId,
        expiresAt: next.expiresAt,
      };
    } else {
      data.entitlements.push(next);
    }
    await writeFileStore(data);
    return idx >= 0 ? data.entitlements[idx] : next;
  });
}

export async function getEntitlementBySession(sessionId: string): Promise<Entitlement | null> {
  if (tursoEnabled()) {
    const db = await turso();
    const rs = await db.execute({
      sql: "SELECT * FROM entitlements WHERE stripe_session_id = ? LIMIT 1",
      args: [sessionId],
    });
    const row = rs.rows[0] as Record<string, unknown> | undefined;
    return row ? rowToEntitlement(row) : null;
  }
  const data = await readFileStore();
  return data.entitlements.find((e) => e.stripeSessionId === sessionId) ?? null;
}

export async function getEntitlementByTokenHash(tokenHash: string): Promise<Entitlement | null> {
  if (tursoEnabled()) {
    const db = await turso();
    const rs = await db.execute({
      sql: "SELECT * FROM entitlements WHERE token_hash = ? ORDER BY created_at DESC LIMIT 1",
      args: [tokenHash],
    });
    const row = rs.rows[0] as Record<string, unknown> | undefined;
    return row ? rowToEntitlement(row) : null;
  }
  const data = await readFileStore();
  return data.entitlements.find((e) => e.tokenHash === tokenHash) ?? null;
}

export async function updateTelegramSettings(input: {
  stripeSessionId: string;
  telegramChatId: string | null;
  telegramThresholdPct: number;
  telegramEnabled: boolean;
}): Promise<Entitlement | null> {
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({
      sql: `UPDATE entitlements
            SET telegram_chat_id = ?, telegram_threshold_pct = ?, telegram_enabled = ?
            WHERE stripe_session_id = ?`,
      args: [
        input.telegramChatId,
        input.telegramThresholdPct,
        input.telegramEnabled ? 1 : 0,
        input.stripeSessionId,
      ],
    });
    return getEntitlementBySession(input.stripeSessionId);
  }
  return enqueue(async () => {
    const data = await readFileStore();
    const idx = data.entitlements.findIndex((e) => e.stripeSessionId === input.stripeSessionId);
    if (idx < 0) return null;
    data.entitlements[idx] = {
      ...data.entitlements[idx],
      telegramChatId: input.telegramChatId,
      telegramThresholdPct: input.telegramThresholdPct,
      telegramEnabled: input.telegramEnabled,
    };
    await writeFileStore(data);
    return data.entitlements[idx];
  });
}

export async function listAlertSubscribers(): Promise<Entitlement[]> {
  const now = Date.now();
  if (tursoEnabled()) {
    const db = await turso();
    const rs = await db.execute({
      sql: `SELECT * FROM entitlements
            WHERE telegram_enabled = 1 AND telegram_chat_id IS NOT NULL
              AND (expires_at IS NULL OR expires_at > ?)`,
      args: [now],
    });
    return rs.rows.map((row) => rowToEntitlement(row as Record<string, unknown>));
  }
  const data = await readFileStore();
  return data.entitlements.filter(
    (e) =>
      e.telegramEnabled &&
      e.telegramChatId &&
      (e.expiresAt === null || e.expiresAt > now),
  );
}

export async function markAlertSent(
  stripeSessionId: string,
  lastAlertKey: string,
): Promise<void> {
  const now = Date.now();
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({
      sql: "UPDATE entitlements SET last_alert_at = ?, last_alert_key = ? WHERE stripe_session_id = ?",
      args: [now, lastAlertKey, stripeSessionId],
    });
    return;
  }
  await enqueue(async () => {
    const data = await readFileStore();
    const idx = data.entitlements.findIndex((e) => e.stripeSessionId === stripeSessionId);
    if (idx < 0) return;
    data.entitlements[idx] = {
      ...data.entitlements[idx],
      lastAlertAt: now,
      lastAlertKey,
    };
    await writeFileStore(data);
  });
}

export async function expireBySubscription(subscriptionId: string): Promise<void> {
  const now = Date.now();
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({
      sql: "UPDATE entitlements SET expires_at = ? WHERE stripe_subscription_id = ?",
      args: [now, subscriptionId],
    });
    return;
  }
  await enqueue(async () => {
    const data = await readFileStore();
    data.entitlements = data.entitlements.map((e) =>
      e.stripeSubscriptionId === subscriptionId ? { ...e, expiresAt: now } : e,
    );
    await writeFileStore(data);
  });
}

export async function extendBySubscription(
  subscriptionId: string,
  expiresAt: number,
): Promise<void> {
  if (tursoEnabled()) {
    const db = await turso();
    await db.execute({
      sql: "UPDATE entitlements SET expires_at = ? WHERE stripe_subscription_id = ?",
      args: [expiresAt, subscriptionId],
    });
    return;
  }
  await enqueue(async () => {
    const data = await readFileStore();
    data.entitlements = data.entitlements.map((e) =>
      e.stripeSubscriptionId === subscriptionId ? { ...e, expiresAt } : e,
    );
    await writeFileStore(data);
  });
}

export function storeBackend(): "turso" | "json-file" {
  return tursoEnabled() ? "turso" : "json-file";
}
