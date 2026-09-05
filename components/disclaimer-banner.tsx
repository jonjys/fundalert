import Link from "next/link";

export function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className="border-b border-amber/20 bg-amber/10 px-4 py-2 text-center text-xs leading-5 text-amber md:text-[13px]">
      Informational tool only — not financial advice.
      {!compact && (
        <span className="hidden sm:inline">
          {" "}
          No custody, no auto-trading, no promise of profit.{" "}
          <Link href="/disclaimer" className="underline underline-offset-2">
            Read the disclaimer
          </Link>
          .
        </span>
      )}
    </div>
  );
}
