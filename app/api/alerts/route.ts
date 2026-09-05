import { NextResponse } from "next/server";
import { getAccessFromCookies, verifyToken } from "@/lib/access";
import { buildTradeCards } from "@/lib/cards";
import { DEFAULT_ALERT_THRESHOLD_PCT } from "@/lib/config";
import { getRates } from "@/lib/rates";
import { getEntitlementBySession, updateTelegramSettings } from "@/lib/store";
import { formatAlertMessage, sendTelegramMessage, telegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function parseThreshold(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 5) return null;
  return n;
}

export async function GET() {
  const access = await getAccessFromCookies();
  if (!access.ok || !access.token) {
    return NextResponse.json({ error: "Unlock Trial, Weekly, Pro, or Lifetime first." }, { status: 401 });
  }
  const payload = verifyToken(access.token);
  const entitlement = payload ? await getEntitlementBySession(payload.sid) : null;
  return NextResponse.json({
    botConfigured: telegramConfigured(),
    telegramChatId: entitlement?.telegramChatId ?? "",
    telegramThresholdPct: entitlement?.telegramThresholdPct ?? DEFAULT_ALERT_THRESHOLD_PCT,
    telegramEnabled: entitlement?.telegramEnabled ?? false,
    storePersisted: Boolean(entitlement),
  });
}

export async function POST(request: Request) {
  const access = await getAccessFromCookies();
  if (!access.ok || !access.token) {
    return NextResponse.json({ error: "Unlock Trial, Weekly, Pro, or Lifetime first." }, { status: 401 });
  }
  const payload = verifyToken(access.token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
  }

  const entitlement = await getEntitlementBySession(payload.sid);
  if (!entitlement) {
    return NextResponse.json(
      {
        error:
          "Access is valid, but alert settings need a persistent store. Set TURSO_DATABASE_URL (or rely on the local JSON file in development).",
      },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    telegramChatId?: string;
    telegramThresholdPct?: number;
    telegramEnabled?: boolean;
    test?: boolean;
  } | null;

  const chatId = (body?.telegramChatId || "").trim();
  const threshold = parseThreshold(body?.telegramThresholdPct) ?? DEFAULT_ALERT_THRESHOLD_PCT;
  const enabled = Boolean(body?.telegramEnabled && chatId);

  const updated = await updateTelegramSettings({
    stripeSessionId: entitlement.stripeSessionId,
    telegramChatId: chatId || null,
    telegramThresholdPct: threshold,
    telegramEnabled: enabled,
  });

  if (body?.test) {
    if (!telegramConfigured()) {
      return NextResponse.json({
        ok: true,
        settings: updated,
        test: {
          ok: false,
          error: "TELEGRAM_BOT_TOKEN is not set. UI saved; sending is stubbed until the bot exists.",
        },
      });
    }
    if (!chatId) {
      return NextResponse.json({ error: "Paste a Telegram chat id to send a test." }, { status: 400 });
    }
    const live = await getRates(true);
    const sample = buildTradeCards(live.rates, { max: 1, includeBelowThreshold: true });
    const test = await sendTelegramMessage(
      chatId,
      sample.length > 0
        ? formatAlertMessage({
            thresholdPct: threshold,
            cards: sample,
          })
        : "<b>Fundalert test</b>\nIf you see this, trade-card alerts are wired.\n<i>Informational tip only. Not financial advice. You execute manually.</i>",
    );
    return NextResponse.json({ ok: true, settings: updated, test });
  }

  return NextResponse.json({ ok: true, settings: updated });
}
