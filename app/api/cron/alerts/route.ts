import { NextResponse } from "next/server";
import { buildTradeCards, matchesWatchlist } from "@/lib/cards";
import { appUrl, CARD_THRESHOLD_PCT, CHANNEL_CARD_LIMIT, TELEGRAM_CARD_LIMIT } from "@/lib/config";
import { syncPaperBook } from "@/lib/paper";
import { getRates } from "@/lib/rates";
import { listAlertSubscribers, markAlertSent } from "@/lib/store";
import {
  formatAlertMessage,
  formatChannelMessage,
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

  const rates = await getRates(true);
  let paperIssued = 0;
  let paperSettled = 0;
  const errors: string[] = [];

  try {
    const paper = await syncPaperBook(rates.rates);
    paperIssued = paper.issued.length;
    paperSettled = paper.settled.length;
  } catch (err) {
    errors.push(`PAPER: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!telegramConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "TELEGRAM_BOT_TOKEN is not set",
      paperIssued,
      paperSettled,
      errors,
      fetchedAt: rates.fetchedAt,
    });
  }

  const sent: Array<{ email: string; count: number }> = [];
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (channelId) {
    const channelCards = buildTradeCards(rates.rates, {
      thresholdPct: CARD_THRESHOLD_PCT,
      max: CHANNEL_CARD_LIMIT,
    });

    if (channelCards.length > 0 && paperIssued > 0) {
      const channelResult = await sendTelegramMessage(
        channelId,
        formatChannelMessage({ cards: channelCards, origin: appUrl() }),
      );
      if (!channelResult.ok) {
        errors.push(`CHANNEL: ${channelResult.error}`);
      }
    }
  }

  const subscribers = await listAlertSubscribers();

  for (const sub of subscribers) {
    if (!sub.telegramChatId) continue;

    const cards = buildTradeCards(rates.rates, {
      thresholdPct: sub.telegramThresholdPct,
      max: TELEGRAM_CARD_LIMIT,
    }).filter((card) => matchesWatchlist(card.symbol, sub.telegramWatchlist));

    if (cards.length === 0) continue;

    const key = cards
      .slice(0, TELEGRAM_CARD_LIMIT)
      .map((card) => `${card.exchange}:${card.symbol}:${card.fundingRatePct.toFixed(4)}`)
      .join("|");

    if (key && key === sub.lastAlertKey) continue;

    const result = await sendTelegramMessage(
      sub.telegramChatId,
      formatAlertMessage({
        thresholdPct: sub.telegramThresholdPct,
        cards,
      }),
    );

    if (result.ok) {
      await markAlertSent(sub.stripeSessionId, key);
      sent.push({
        email: sub.email,
        count: cards.length,
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
    paperIssued,
    paperSettled,
    details: sent,
    errors,
    fetchedAt: rates.fetchedAt,
  });
}
