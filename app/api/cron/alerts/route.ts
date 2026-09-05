import { NextResponse } from "next/server";
import { getRates } from "@/lib/rates";
import { listAlertSubscribers, markAlertSent } from "@/lib/store";
import {
  formatAlertMessage,
  sendTelegramMessage,
  telegramConfigured,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret) return auth === `Bearer ${secret}`;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  if (process.env.NODE_ENV !== "production") return true;

  return false;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!telegramConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "TELEGRAM_BOT_TOKEN is not set",
    });
  }

  const [rates, subscribers] = await Promise.all([
    getRates(true),
    listAlertSubscribers(),
  ]);

  const sent: Array<{ email: string; count: number }> = [];
  const errors: string[] = [];

  // =========================
  // PUBLIC TELEGRAM CHANNEL
  // =========================

  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (channelId) {
    const extremes = [...rates.rates]
      .sort(
        (a, b) =>
          Math.abs(b.fundingRatePct) - Math.abs(a.fundingRatePct)
      )
      .filter((row) => Math.abs(row.fundingRatePct) >= 0.05)
      .slice(0, 5);

    if (extremes.length > 0) {
      const lines = extremes.map(
        (row) =>
          `🔥 ${row.symbol} · ${row.exchange}\nFunding: ${row.fundingRatePct.toFixed(4)}%`
      );

      const message =
        `<b>⚡ FUNDALERT EXTREMES</b>\n\n` +
        lines.join("\n\n") +
        `\n\n🔎 Full radar:\nhttps://fundalert-xi.vercel.app/radar` +
        `\n\n<i>Informational only — not financial advice.</i>`;

      const channelResult = await sendTelegramMessage(channelId, message);

      if (!channelResult.ok) {
        errors.push(`CHANNEL: ${channelResult.error}`);
      }
    }
  }

  // =========================
  // PAID PRIVATE ALERTS
  // =========================

  for (const sub of subscribers) {
    if (!sub.telegramChatId) continue;

    let hits = rates.rates.filter(
      (row) =>
        Math.abs(row.fundingRatePct) >= sub.telegramThresholdPct
    );

    const watchlist = (sub as any).telegramWatchlist as string | null;

    if (
      watchlist &&
      watchlist.trim() !== "" &&
      watchlist.toUpperCase() !== "ALL"
    ) {
      const wl = watchlist
        .toUpperCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      hits = hits.filter((row) =>
        wl.some((w) => row.symbol.toUpperCase().includes(w))
      );
    }

    if (hits.length === 0) continue;

    const key = hits
      .slice(0, 8)
      .map(
        (r) =>
          `${r.exchange}:${r.symbol}:${r.fundingRatePct.toFixed(4)}`
      )
      .join("|");

    if (key && key === sub.lastAlertKey) continue;

    const result = await sendTelegramMessage(
      sub.telegramChatId,
      formatAlertMessage({
        thresholdPct: sub.telegramThresholdPct,
        rows: hits,
      })
    );

    if (result.ok) {
      await markAlertSent(sub.stripeSessionId, key);
      sent.push({
        email: sub.email,
        count: hits.length,
      });
    } else {
      errors.push(`${sub.email}: ${result.error}`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: subscribers.length,
    sent: sent.length,
    channel: channelId ?? null,
    details: sent,
    errors,
    fetchedAt: rates.fetchedAt,
  });
}
