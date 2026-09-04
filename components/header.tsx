import Link from "next/link";
import type { AccessState } from "@/lib/types";

const links = [
  { href: "/radar", label: "Radar" },
  { href: "/alerts", label: "Alerts" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/unlock", label: "Unlock" },
];

export function Header({ access }: { access: AccessState }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080c]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-lime/40 bg-lime/10 text-xs font-bold text-lime">
            FA
          </span>
          <span className="text-sm font-semibold tracking-[0.22em] uppercase">
            Fundalert
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-white/70">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          {access.ok ? (
            <span className="ml-1 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs uppercase tracking-wider text-lime">
              {access.plan}
            </span>
          ) : (
            <Link
              href="/#pricing"
              className="ml-1 rounded-full bg-lime px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-black"
            >
              Get access
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
