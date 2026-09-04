import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-white/55 md:flex-row md:items-start md:justify-between">
        <p className="max-w-2xl leading-6">
          Fundalert is an informational market-data tool. It is not financial advice,
          not a broker, and does not custody funds or place trades. Perpetual funding
          rates can be wrong, delayed, or geo-blocked. You can lose money trading
          crypto.{" "}
          <Link href="/disclaimer" className="text-lime/80 underline-offset-2 hover:underline">
            Full disclaimer
          </Link>
          .
        </p>
        <p className="mono text-xs text-white/40">No custody · No auto-trading · No profit promise</p>
      </div>
    </footer>
  );
}
