import { PAYMENT_LINKS } from "@/lib/config";

export function StickyTrialBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#07080c]/95 px-3 py-2.5 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-6xl gap-2">
        <a
          href={PAYMENT_LINKS.trial ?? "/#pricing"}
          className="flex-1 rounded-xl bg-lime px-3 py-3 text-center text-sm font-semibold text-black"
        >
          Trial 29 SEK / 3 days
        </a>
        <a
          href={PAYMENT_LINKS.weekly ?? "/#pricing"}
          className="rounded-xl border border-white/15 px-3 py-3 text-center text-sm text-white"
        >
          Weekly 99 SEK
        </a>
      </div>
    </div>
  );
}
