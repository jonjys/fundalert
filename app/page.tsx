import Link from "next/link";
import { Pricing } from "@/components/pricing";
import { RatesTable } from "@/components/rates-table";
import { isStripeConfigured, PAYMENT_LINKS } from "@/lib/config";
import { getRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rates = await getRates(false);
  const stripeReady = isStripeConfigured();

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-12">
      <div className="scanline pointer-events-none absolute inset-0 opacity-40" />
      <section className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60">
            <span className="pulse-dot" />
            Perp funding radar
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
            Get paid to wait — or know when funding flips.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/65 md:text-lg">
            Watch live perpetual funding rates across Binance USDT-M and Bybit.
            Free users see the top 5. Paying users get the full book and optional
            Telegram pings when |funding| spikes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={PAYMENT_LINKS.pro ?? "#pricing"}
              className="rounded-xl bg-lime px-5 py-3 text-sm font-semibold text-black"
            >
              Unlock Pro — 399 SEK
            </a>
            <Link
              href="/radar"
              className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white"
            >
              Open public preview
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
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">How it works</p>
          <ol className="mt-4 space-y-4 text-sm text-white/75">
            <li>
              <span className="mono text-lime">01</span> Public REST from exchanges — no
              exchange API keys.
            </li>
            <li>
              <span className="mono text-lime">02</span> Sorted by absolute funding so
              extremes surface first.
            </li>
            <li>
              <span className="mono text-lime">03</span> Stripe Checkout unlocks the full
              radar + alert settings.
            </li>
          </ol>
        </div>
      </section>

      <section className="relative mt-14">
        <RatesTable initial={rates} endpoint="/api/rates?public=1" locked />
      </section>

      <section className="relative mt-16">
        <Pricing stripeReady={stripeReady} />
      </section>
    </main>
  );
}
