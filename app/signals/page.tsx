import type { Metadata } from "next";
import Link from "next/link";
import { GrowthLoop } from "@/components/growth-loop";
import { HeroCtas } from "@/components/hero-ctas";
import { PaperTrack } from "@/components/paper-track";
import { TradeCards } from "@/components/trade-cards";
import { getAccessFromCookies } from "@/lib/access";
import { buildTradeCards } from "@/lib/cards";
import { appUrl, CARD_THRESHOLD_PCT } from "@/lib/config";
import { getPaperTrackSafe } from "@/lib/paper";
import { getRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signals",
};

export default async function SignalsPage() {
  const access = await getAccessFromCookies();
  const [rates, track] = await Promise.all([getRates(access.ok), getPaperTrackSafe()]);
  const extremeCount = buildTradeCards(rates.rates, {
    thresholdPct: CARD_THRESHOLD_PCT,
    max: 8,
  }).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-lime/80">
            <span className="pulse-dot" />
            Funding-carry cards
          </p>
          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight md:text-3xl">
            Actionable trade cards. Manual execution.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            {access.ok
              ? `Unlocked (${access.plan}). Extreme funding → bias, size, timing, invalidation. You still click the order.`
              : "Free teasers below. Trial 29 SEK / 3 days unlocks the full desk and private Telegram cards."}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-lime/85">
            {extremeCount > 0
              ? "Desk is posting extremes now."
              : "No extreme print in this snapshot — Trial still unlocks the next private cards."}
          </p>
        </div>
        {access.ok ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/#share"
              className="rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-black"
            >
              Invite & earn
            </Link>
            <Link
              href="/unlock"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white"
            >
              Gift / redeem
            </Link>
            <Link
              href="/radar"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white"
            >
              Raw book
            </Link>
          </div>
        ) : (
          <HeroCtas compact />
        )}
      </div>
      <TradeCards
        initial={rates}
        endpoint={access.ok ? "/api/rates" : "/api/rates?public=1"}
        locked={!access.ok}
      />
      <div className="mt-10">
        <GrowthLoop origin={appUrl()} inviteCode={access.referralCode} unlocked={access.ok} />
      </div>
      <div className="mt-10">
        <PaperTrack track={track} />
      </div>
    </main>
  );
}
