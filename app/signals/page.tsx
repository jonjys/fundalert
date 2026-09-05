import type { Metadata } from "next";
import Link from "next/link";
import { PaperTrack } from "@/components/paper-track";
import { TradeCards } from "@/components/trade-cards";
import { getAccessFromCookies } from "@/lib/access";
import { PAYMENT_LINKS } from "@/lib/config";
import { getPaperTrackSafe } from "@/lib/paper";
import { getRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signals",
};

export default async function SignalsPage() {
  const access = await getAccessFromCookies();
  const [rates, track] = await Promise.all([getRates(access.ok), getPaperTrackSafe()]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime/80">Desk tips</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Trade cards</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            {access.ok
              ? `Unlocked (${access.plan}). Extreme funding → bias, size, timing, invalidation. Informational only — you execute.`
              : "Free teaser is a few cards. Trial (3 days · 29 SEK) unlocks the full desk and Telegram cards."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!access.ok && (
            <a
              href={PAYMENT_LINKS.trial ?? "/#pricing"}
              className="rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-black"
            >
              Trial 29 SEK / 3 days
            </a>
          )}
          <Link
            href="/radar"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white"
          >
            Raw book
          </Link>
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
    </main>
  );
}
