import Link from "next/link";
import { HeroCtas } from "@/components/hero-ctas";
import { PaperTrack } from "@/components/paper-track";
import { RatesTable } from "@/components/rates-table";
import { TradeCards } from "@/components/trade-cards";
import { getAccessFromCookies } from "@/lib/access";
import { getPaperTrackSafe } from "@/lib/paper";
import { getRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const access = await getAccessFromCookies();
  const [rates, track] = await Promise.all([getRates(access.ok), getPaperTrackSafe()]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime/80">Live book</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Funding radar</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            {access.ok
              ? `Unlocked (${access.plan}). Cards first, then the raw book. Informational market data only.`
              : "Free preview is a few trade cards plus the top 5 by |funding|. Unlock Trial (3 days · 29 SEK) for the full desk."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/signals"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white"
          >
            Signals
          </Link>
          {!access.ok && <HeroCtas compact />}
        </div>
      </div>
      <TradeCards
        initial={rates}
        endpoint={access.ok ? "/api/rates" : "/api/rates?public=1"}
        locked={!access.ok}
      />
      <div className="mt-10">
        <PaperTrack track={track} />
      </div>
      <div className="mt-10">
        <RatesTable
          initial={rates}
          endpoint={access.ok ? "/api/rates" : "/api/rates?public=1"}
          locked={!access.ok}
        />
      </div>
    </main>
  );
}
