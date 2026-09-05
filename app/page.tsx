import Link from "next/link";
import { PaidReturn } from "@/components/paid-return-loader";
import { PaperTrack } from "@/components/paper-track";
import { Pricing } from "@/components/pricing";
import { RatesTable } from "@/components/rates-table";
import { TradeCards } from "@/components/trade-cards";
import { isStripeConfigured, PAYMENT_LINKS } from "@/lib/config";
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

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-12">
      <div className="scanline pointer-events-none absolute inset-0 opacity-40" />
      {(paidPlan || sessionId) && (
        <div className="relative">
          <PaidReturn plan={paidPlan} sessionId={sessionId ?? null} />
        </div>
      )}
      <section className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60">
            <span className="pulse-dot" />
            Telegram trade cards
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
            Telegram trade cards when funding goes extreme.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/65 md:text-lg">
            Clear action, timing, and risk — not a raw funding table. When |funding|
            spikes we send a desk tip: long perps if funding is very negative, short if
            very positive. Trial is 29 SEK / 3 days. You execute manually. We never
            hold funds or place orders.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={PAYMENT_LINKS.trial ?? "#pricing"}
              className="rounded-xl bg-lime px-5 py-3 text-sm font-semibold text-black"
            >
              Try 3 days — 29 SEK
            </a>
            <Link
              href="/signals"
              className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white"
            >
              See teaser cards
            </Link>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-white/40">Custody</dt>
              <dd className="mt-1 font-medium">None</dd>
            </div>
            <div>
              <dt className="text-white/40">Auto-trade</dt>
              <dd className="mt-1 font-medium">Never</dd>
            </div>
            <div>
              <dt className="text-white/40">Advice</dt>
              <dd className="mt-1 font-medium">Not this</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">How a card works</p>
          <ol className="mt-4 space-y-4 text-sm text-white/75">
            <li>
              <span className="mono text-lime">01</span> Public REST from exchanges — no
              exchange API keys.
            </li>
            <li>
              <span className="mono text-lime">02</span> Extreme |funding| becomes a tip:
              bias, 5–15% size, entry window, invalidation, 24h carry.
            </li>
            <li>
              <span className="mono text-lime">03</span> Telegram private alerts + optional
              public channel. Trial first. You still click the order.
            </li>
          </ol>
        </div>
      </section>

      <section className="relative mt-14">
        <TradeCards initial={rates} endpoint="/api/rates?public=1" locked teaser />
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
