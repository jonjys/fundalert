import Link from "next/link";
import { BILLING_EMAIL, PAYMENT_LINKS, PLANS } from "@/lib/config";
import type { PlanId } from "@/lib/types";

const COPY: Record<
  PlanId,
  { title: string; body: string; next: string }
> = {
  trial: {
    title: "Trial checkout complete",
    body: "You have 3-day full-book radar access. This is a funding-rate radar (tips and optional alerts) — no custody, no auto-trade, not financial advice.",
    next: "If the book is still locked, email billing with your Stripe receipt. Upgrade to Weekly (99 SEK) when the trial ends.",
  },
  weekly: {
    title: "Weekly checkout complete",
    body: "You have weekly full-book radar access. Informational tool only — not financial advice.",
    next: "If the book is still locked, email billing with your Stripe receipt or paste an access code on /unlock.",
  },
  pro: {
    title: "Pro checkout complete",
    body: "You have monthly Pro radar access. Informational tool only — not financial advice.",
    next: "If the book is still locked, email billing with your Stripe receipt or paste an access code on /unlock.",
  },
  lifetime: {
    title: "Lifetime checkout complete",
    body: "You have lifetime radar access. Informational tool only — not financial advice.",
    next: "If the book is still locked, email billing with your Stripe receipt or paste an access code on /unlock.",
  },
};

export function PaidReturnNotice({ plan }: { plan: PlanId }) {
  const copy = COPY[plan];
  const upgradeHref = PAYMENT_LINKS.weekly;

  return (
    <aside
      id="paid"
      className="mb-10 rounded-2xl border border-lime/40 bg-lime/[0.08] px-5 py-5"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-lime/80">Payment received</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{copy.title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/75">{copy.body}</p>
      <p className="mt-2 text-sm leading-6 text-white/60">{copy.next}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/radar"
          className="rounded-xl bg-lime px-4 py-2.5 font-semibold text-black"
        >
          Open radar
        </Link>
        <Link
          href="/unlock"
          className="rounded-xl border border-white/15 px-4 py-2.5 text-white"
        >
          Paste access code
        </Link>
        {plan === "trial" && upgradeHref && (
          <a
            href={upgradeHref}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-white"
          >
            Upgrade to Weekly
          </a>
        )}
        <a
          href={`mailto:${BILLING_EMAIL}?subject=${encodeURIComponent(
            `Fundalert ${PLANS[plan].name} access`,
          )}`}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-white"
        >
          Email {BILLING_EMAIL}
        </a>
      </div>
    </aside>
  );
}
