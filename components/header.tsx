import Link from "next/link";
import { PAYMENT_LINKS } from "@/lib/config";
import type { AccessState } from "@/lib/types";

const links = [
  { href: "/signals", label: "Signals" },
  { href: "/radar", label: "Radar" },
  { href: "/alerts", label: "Alerts" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/unlock", label: "Unlock" },
];

export function Header({ access }: { access: AccessState }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080c]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-lime/40 bg-lime/10 text-xs font-bold text-lime">
            FA
          </span>
          <span className="text-sm font-semibold tracking-[0.22em] uppercase">
            Fundalert
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm text-white/70 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {access.ok ? (
            <>
              <Link
                href="/signals#share"
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
              >
                Invite
              </Link>
              <span className="rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs uppercase tracking-wider text-lime">
                {access.plan}
              </span>
            </>
          ) : (
            <>
              <a
                href={PAYMENT_LINKS.weekly ?? "/#pricing"}
                className="hidden rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white sm:inline-flex"
              >
                Weekly 99
              </a>
              <a
                href={PAYMENT_LINKS.trial ?? "/#pricing"}
                className="rounded-full bg-lime px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-black"
              >
                Trial 29 SEK
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
