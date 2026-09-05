import Link from "next/link";
import { GrowthLoop } from "@/components/growth-loop";
import { HeroCtas } from "@/components/hero-ctas";
import { PaidReturn } from "@/components/paid-return-loader";
import { PaperTrack } from "@/components/paper-track";
import { Pricing } from "@/components/pricing";
import { RatesTable } from "@/components/rates-table";
import { TradeCards } from "@/components/trade-cards";
import { buildTradeCards } from "@/lib/cards";
import { appUrl, CARD_THRESHOLD_PCT, isStripeConfigured } from "@/lib/config";
import { getPaperTrackSafe } from "@/lib/paper";
import { getRates } from "@/lib/rates";
import { isPlanId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; session_id?: string }>;
}) {
  const [rates, track] = await Promise.all([getRates(false), getPaperTrackSafe()]);
  const stripeReady = isStripeConfigured();
  const { paid, session_id: sessionId } = await searchParams;
  const paidPlan = isPlanId(paid) ? paid : null;
  const extremeCount = buildTradeCards(rates.rates, {
    thresholdPct: CARD_THRESHOLD_PCT,
    max: 8,
  }).length;

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-6 md:pt-12">
      <div className="scanline pointer-events-none absolute inset-0 opacity-40" />
      {(paidPlan || sessionId) && (
        <div className="relative">
          <PaidReturn plan={paidPlan} sessionId={sessionId ?? null} />
        </div>
      )}
      <section className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60">
            <span className="pulse-dot" />
            Funding-carry desk
          </p>
          <h1 className="mt-4 max-w-xl text-[1.85rem] font-semibold tracking-tight sm:text-4xl md:text-6xl md:leading-[1.05]">
            Actionable funding-carry trade cards. You execute.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 md:text-lg md:leading-7">
            Extreme funding → a card (bias, size, invalidation) → you trade it
            manually → we paper-track the last 7 days. No custody. No auto-orders.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-lime/85">
            {extremeCount > 0
              ? "Desk is posting extremes now. Teasers are free; private Telegram cards sit behind Trial."
              : "Desk is watching the book. Trial unlocks private Telegram cards when funding spikes."}
          </p>
          <div className="mt-6">
            <HeroCtas />
          </div>
          <p className="mt-3 text-xs text-white/45">
            Trial 29 SEK / 3 days · then Weekly 99 SEK for private Telegram cards ·{" "}
            <Link href="/signals" className="text-white/70 underline-offset-2 hover:underline">
              see teasers
            </Link>
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">How it pays</p>
          <ol className="mt-4 space-y-4 text-sm text-white/75">
            <li>
              <span className="mono text-lime">01</span> Extreme perp funding prints on
              public REST — no exchange API keys.
            </li>
            <li>
              <span className="mono text-lime">02</span> You get a card: long if funding is
              very negative, short if very positive. 5–15% size, entry window, invalidation.
            </li>
            <li>
              <span className="mono text-lime">03</span> You click the order. We paper-mark
              the same contract after 8h so the track record stays honest.
            </li>
          </ol>
        </div>
      </section>

      <section className="relative mt-10">
        <TradeCards initial={rates} endpoint="/api/rates?public=1" locked teaser />
      </section>

      <section className="relative mt-10">
        <GrowthLoop origin={appUrl()} />
      </section>

      <section className="relative mt-10">
        <PaperTrack track={track} />
      </section>

      <section className="relative mt-14">
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">
          Raw book (free top 5)
        </p>
        <RatesTable initial={rates} endpoint="/api/rates?public=1" locked />
      </section>

      <section className="relative mt-16">
        <Pricing stripeReady={stripeReady} />
      </section>
    </main>
  );
}
