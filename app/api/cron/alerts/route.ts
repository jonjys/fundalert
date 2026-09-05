import { NextResponse } from "next/server";
import { getRates } from "@/lib/rates";
import { listAlertSubscribers, markAlertSent } from "@/lib/store";
import { formatAlertMessage, sendTelegramMessage, telegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret) return auth === `Bearer ${secret}`;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  if (process.env.NODE_ENV!== "production") return true;
  return false;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!telegramConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "TELEGRAM_BOT_TOKEN is not set" });
  }

  const [rates, subscribers] = await Promise.all([getRates(true), listAlertSubscribers()]);
  const sent: Array<{ email: string; count: number }> = [];
  const errors: string[] = [];

  for (const sub of subscribers) {
    if (!sub.telegramChatId) continue;

    let hits = rates.rates.filter(
      (row) => Math.abs(row.fundingRatePct) >= sub.telegramThresholdPct,
    );

    // LÅSNING TILL SPECIFIK TRADE
    const watchlist = (sub as any).telegramWatchlist as string | null;
    if (watchlist && watchlist.trim()!== "" && watchlist.toUpperCase()!== "ALL") {
      const wl = watchlist.toUpperCase().split(',').map(s=>s.trim()).filter(Boolean);
      hits = hits.filter(row =>
        wl.some(w => row.symbol.toUpperCase().includes(w))
      );
    }

    if (hits.length === 0) continue;

    const key = hits.slice(0, 8).map(r=>`${r.exchange}:${r.symbol}:${r.fundingRatePct.toFixed(4)}`).join("|");
    if (key && key === sub.lastAlertKey) continue;

    const result = await sendTelegramMessage(
      sub.telegramChatId,
      formatAlertMessage({ thresholdPct: sub.telegramThresholdPct, rows: hits }),
    );
    if (result.ok) {
      await markAlertSent(sub.stripeSessionId, key);
      sent.push({ email: sub.email, count: hits.length });
    } else {
      errors.push(`${sub.email}: ${result.error}`);
    }
  }

  return NextResponse.json({ ok: true, checked: subscribers.length, sent: sent.length, details: sent, errors, fetchedAt: rates.fetchedAt });
}
