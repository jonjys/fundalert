"use client";

import { useState } from "react";
import { lifetimeMailto, PAYMENT_LINKS, PLANS, SECONDARY_PLAN_IDS } from "@/lib/config";
import type { PlanId } from "@/lib/types";

const ctaClass = (highlighted: boolean | undefined, extra = "") =>
  `mt-6 inline-flex items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold ${
    highlighted
      ? "bg-lime text-black hover:bg-[#d8ff6a]"
      : "bg-white/10 text-white hover:bg-white/16"
  } ${extra}`;

function PlanCta({
  id,
  highlighted,
  stripeReady,
  busy,
  onLifetime,
}: {
  id: PlanId;
  highlighted?: boolean;
  stripeReady: boolean;
  busy: boolean;
  onLifetime: () => void;
}) {
  const plan = PLANS[id];
  const paymentHref = PAYMENT_LINKS[id];
  if (paymentHref) {
    return (
      <a href={paymentHref} className={ctaClass(highlighted)}>
        {plan.ctaLabel}
      </a>
    );
  }
  if (id === "lifetime" && stripeReady) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onLifetime}
        className={ctaClass(highlighted, "disabled:cursor-not-allowed disabled:opacity-50")}
      >
        {busy ? "Redirecting…" : plan.ctaLabel}
      </button>
    );
  }
  if (id === "lifetime") {
    return (
      <a href={lifetimeMailto()} className={ctaClass(highlighted)}>
        Email for Lifetime
      </a>
    );
  }
  return null;
}

export function Pricing({ stripeReady }: { stripeReady: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trial = PLANS.trial;

  async function checkoutLifetime() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "lifetime" }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Checkout failed");
      }
      window.location.assign(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <section id="pricing" className="scroll-mt-24">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-lime/80">Self-serve</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Try the full radar. Then pick a cycle.
        </h2>
        <p className="mt-3 text-white/60">
          Start with a 3-day trial (29 SEK) for the full book. Weekly (99 SEK) and Pro
          (399 SEK) stay available. Lifetime is 1,990 SEK one-time — email billing if the
          live link is not up yet. Radar and tips only: no custody, no auto-trade, not
          financial advice.
        </p>
      </div>

      <article className="mb-4 flex flex-col rounded-2xl border border-lime/50 bg-lime/[0.07] p-6 shadow-[0_0_80px_rgba(200,255,61,0.08)] md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="max-w-xl">
          <div className="flex items-baseline justify-between gap-3 md:justify-start md:gap-4">
            <h3 className="text-2xl font-semibold">{trial.name}</h3>
            <span className="text-[11px] uppercase tracking-wider text-lime">Start here</span>
          </div>
          <p className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-semibold">{trial.priceLabel}</span>
            <span className="pb-1 text-sm text-white/45">3 days · 29 SEK</span>
          </p>
          <p className="mt-2 text-sm text-white/70">{trial.blurb}</p>
          <ul className="mt-4 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
            {trial.features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-lime">▸</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex w-full flex-col md:mt-0 md:w-auto md:min-w-[240px]">
          <PlanCta
            id="trial"
            highlighted
            stripeReady={stripeReady}
            busy={busy}
            onLifetime={checkoutLifetime}
          />
          <p className="mt-3 text-center text-xs leading-5 text-white/45 md:text-left">
            One-time. Upgrade to Weekly when you want the next cycle.
          </p>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        {SECONDARY_PLAN_IDS.map((id) => {
          const plan = PLANS[id];
          return (
            <article
              key={id}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
              </div>
              <p className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">{plan.priceLabel}</span>
                <span className="pb-1 text-sm text-white/45">{plan.cadence}</span>
              </p>
              <p className="mt-2 text-sm text-white/60">{plan.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-white/75">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-lime">▸</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <PlanCta
                id={id}
                highlighted={false}
                stripeReady={stripeReady}
                busy={busy}
                onLifetime={checkoutLifetime}
              />
            </article>
          );
        })}
      </div>
      {error && <p className="mt-4 text-sm text-rose">{error}</p>}
    </section>
  );
}
