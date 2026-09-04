import Link from "next/link";
import { RatesTable } from "@/components/rates-table";
import { getAccessFromCookies } from "@/lib/access";
import { getRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const access = await getAccessFromCookies();
  const rates = await getRates(access.ok);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime/80">Live book</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Funding radar</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            {access.ok
              ? `Unlocked (${access.plan}). Refresh ~45s. Informational market data only.`
              : "Free preview is top 5 by |funding|. Unlock Weekly, Pro, or Lifetime for the full book."}
          </p>
        </div>
        {!access.ok && (
          <Link
            href="/#pricing"
            className="rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-black"
          >
            Unlock full radar
          </Link>
        )}
      </div>
      <RatesTable
        initial={rates}
        endpoint={access.ok ? "/api/rates" : "/api/rates?public=1"}
        locked={!access.ok}
      />
    </main>
  );
}
