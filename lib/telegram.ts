import {
  CARD_DISCLAIMER,
  CARD_SIZE_MAX_PCT,
  CHANNEL_CARD_LIMIT,
  PAYMENT_LINKS,
  TELEGRAM_CARD_LIMIT,
} from "./config";
import { exchangeLabel, formatPct } from "./format";
import type { TradeCard } from "./types";

const TELEGRAM_API = "https://api.telegram.org";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set" };
  }
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; description?: string };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.description || `Telegram HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatTradeCardHtml(card: TradeCard): string {
  const bias = card.side === "short" ? "SHORT perps" : "LONG perps";
  const conf = card.confidence.toUpperCase();
  return [
    `<b>TRADE CARD</b> · ${escapeHtml(conf)}`,
    `<code>${escapeHtml(card.symbol)}</code> · ${escapeHtml(exchangeLabel(card.exchange))}`,
    "",
    `Bias: <b>${bias}</b>`,
    `${escapeHtml(card.biasLabel)}`,
    `Funding: ${escapeHtml(formatPct(card.fundingRatePct))}  ·  24h ${escapeHtml(formatPct(card.expected24hPct))} of notional`,
    `APR (interval annualized): ${escapeHtml(formatPct(card.annualizedPct, 1))}`,
    `Size: ${card.sizePct}% of equity (conservative cap ${CARD_SIZE_MAX_PCT}%)`,
    `Entry: ${escapeHtml(card.entryNote)}`,
    `Invalidation: ${escapeHtml(card.invalidation)}`,
    "",
    `<i>${escapeHtml(card.disclaimer)}</i>`,
  ].join("\n");
}

export function formatTradeCardsMessage(input: {
  title: string;
  subtitle?: string;
  cards: TradeCard[];
  footer?: string;
  max?: number;
}): string {
  const cards = input.cards.slice(0, input.max ?? 8);
  const blocks = [`<b>${escapeHtml(input.title)}</b>`];
  if (input.subtitle) blocks.push(escapeHtml(input.subtitle));
  blocks.push("");

  for (const [index, card] of cards.entries()) {
    if (index > 0) blocks.push("————");
    blocks.push(formatTradeCardHtml(card));
  }

  if (cards.length === 0) {
    blocks.push("No extreme funding cards right now.");
  }

  blocks.push("", `<i>${escapeHtml(input.footer ?? CARD_DISCLAIMER)}</i>`);
  return blocks.join("\n");
}

export function formatAlertMessage(input: {
  thresholdPct: number;
  cards: TradeCard[];
}): string {
  return formatTradeCardsMessage({
    title: "Fundalert — trade cards",
    subtitle: `|funding| ≥ ${input.thresholdPct.toFixed(4)}%  ·  tips only, you execute`,
    cards: input.cards,
    max: TELEGRAM_CARD_LIMIT,
  });
}

export function formatChannelMessage(input: { cards: TradeCard[]; origin: string }): string {
  const trial = PAYMENT_LINKS.trial ?? `${input.origin}/#pricing`;
  const cards = input.cards.slice(0, CHANNEL_CARD_LIMIT);
  const lines = [
    "<b>⚡ FUNDALERT TRADE CARDS</b>",
    "Extreme funding — classic carry tips. You execute.",
    "",
  ];
  for (const [index, card] of cards.entries()) {
    if (index > 0) lines.push("————");
    lines.push(formatTradeCardHtml(card));
  }
  lines.push(
    "",
    `<b>Trial 3 days · 29 SEK</b>`,
    escapeHtml(trial),
    `${escapeHtml(input.origin)}/signals`,
    "",
    `<i>${escapeHtml(CARD_DISCLAIMER)}</i>`,
  );
  return lines.join("\n");
}
