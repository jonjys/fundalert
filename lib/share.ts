import { PAYMENT_LINKS, TELEGRAM_BOT_USERNAME } from "./config";

export const SHARE_TRIAL_TEXT =
  "Fundalert posts funding-carry trade cards when perp funding goes extreme. You execute manually. Trial 29 SEK / 3 days.";

export function withUtm(url: string, medium: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("utm_source", "share");
  parsed.searchParams.set("utm_medium", medium);
  return parsed.toString();
}

export function siteShareUrl(origin: string, medium: string): string {
  return withUtm(`${origin.replace(/\/$/, "")}/`, medium);
}

export function trialShareUrl(origin: string, medium: string): string {
  const trial = PAYMENT_LINKS.trial;
  if (trial) return withUtm(trial, medium);
  return withUtm(`${origin.replace(/\/$/, "")}/#pricing`, medium);
}

export function inviteShareUrl(origin: string, code: string, medium: string): string {
  return withUtm(`${origin.replace(/\/$/, "")}/invite/${code}`, medium);
}

export function trialShareSnippet(origin: string, medium = "copy"): string {
  return [
    SHARE_TRIAL_TEXT,
    "",
    siteShareUrl(origin, medium),
    `Trial: ${trialShareUrl(origin, medium)}`,
    `Bot: @${TELEGRAM_BOT_USERNAME}`,
  ].join("\n");
}

export function inviteShareSnippet(origin: string, code: string, medium = "copy"): string {
  return [
    "I use Fundalert for funding-carry trade cards. Trial is 29 SEK / 3 days — you get +3 days, I get +7 when you pay.",
    "",
    inviteShareUrl(origin, code, medium),
    `Bot: @${TELEGRAM_BOT_USERNAME}`,
  ].join("\n");
}

export function twitterShareHref(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function telegramShareHref(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}
