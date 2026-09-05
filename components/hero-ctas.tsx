import { PAYMENT_LINKS } from "@/lib/config";

export function HeroCtas({ compact = false }: { compact?: boolean }) {
  const trialHref = PAYMENT_LINKS.trial ?? "/#pricing";
  const weeklyHref = PAYMENT_LINKS.weekly ?? "/#pricing";
  const pad = compact ? "px-4 py-2.5 text-sm" : "px-5 py-3 text-sm";

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={trialHref}
        className={`rounded-xl bg-lime font-semibold text-black ${pad}`}
      >
        Trial 29 SEK / 3 days
      </a>
      <a
        href={weeklyHref}
        className={`rounded-xl border border-white/15 text-white ${pad}`}
      >
        Weekly 99 SEK
      </a>
    </div>
  );
}
