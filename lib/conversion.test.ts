import assert from "node:assert/strict";
import { PAYMENT_LINKS, TELEGRAM_BOT_USERNAME } from "./config";
import {
  inviteShareSnippet,
  siteShareUrl,
  telegramShareHref,
  trialShareSnippet,
  trialShareUrl,
  twitterShareHref,
} from "./share";
import { formatChannelMessage } from "./telegram";
import type { TradeCard } from "./types";

const origin = "https://fundalert-xi.vercel.app";

const card: TradeCard = {
  id: "binance:BTCUSDT",
  exchange: "binance",
  symbol: "BTCUSDT",
  base: "BTC",
  quote: "USDT",
  fundingRatePct: 0.12,
  annualizedPct: 131.4,
  expected24hPct: 0.36,
  markPrice: 100,
  nextFundingTime: Date.now() + 3_600_000,
  intervalHours: 8,
  side: "short",
  biasLabel: "Short perps — longs pay",
  sizePct: 10,
  entryNote: "Enter near next print",
  invalidation: "Rate flips below -0.01%",
  collapsePct: 0.06,
  flipPct: 0.01,
  confidence: "med",
  extreme: true,
  disclaimer: "Informational tip only.",
};

const channel = formatChannelMessage({ cards: [card], origin });
assert.match(channel, /Trial 29 SEK \/ 3 days/);
assert.match(channel, /Weekly 99 SEK/);
assert.ok(channel.includes(`${origin}/signals`));
assert.ok(PAYMENT_LINKS.trial && channel.includes(PAYMENT_LINKS.trial));
assert.ok(channel.includes(`@${TELEGRAM_BOT_USERNAME}`));
assert.ok(channel.indexOf("Unlock private Telegram cards") > channel.indexOf("TRADE CARD"));

const site = siteShareUrl(origin, "x");
assert.ok(site.includes("utm_source=share"));
assert.ok(site.includes("utm_medium=x"));

const trial = trialShareUrl(origin, "telegram");
assert.ok(trial.includes("utm_source=share"));
assert.ok(trial.includes("utm_medium=telegram"));

const snippet = trialShareSnippet(origin, "copy");
assert.match(snippet, /Trial 29 SEK \/ 3 days/);
assert.ok(snippet.includes(trialShareUrl(origin, "copy")));
assert.ok(snippet.includes(`@${TELEGRAM_BOT_USERNAME}`));

const invite = inviteShareSnippet(origin, "ABC12DEF", "copy");
assert.ok(invite.includes("/invite/ABC12DEF"));
assert.ok(invite.includes("utm_medium=copy"));

assert.ok(twitterShareHref("hello").startsWith("https://twitter.com/intent/tweet"));
assert.ok(telegramShareHref(origin, "hello").startsWith("https://t.me/share/url"));

console.log("conversion.test.ts ok");
