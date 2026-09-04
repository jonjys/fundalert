"use client";

import { useState } from "react";
import { lifetimeMailto, PAYMENT_LINKS, PLANS } from "@/lib/config";
import type { PlanId } from "@/lib/types";

const ctaClass = (highlighted: boolean | undefined, extra = "") =>
  `mt-6 inline-flex items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold ${
    highlighted
      ? "bg-lime text-black hover:bg-[#d8ff6a]"
      : "bg-white/10 text-white hover:bg-white/16"
  } ${extra}`;

export function Pricing({ stripeReady }: { stripeReady: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Paywall. Then the full book.</h2>
        <p className="mt-3 text-white/60">
          Weekly and Pro check out on Stripe immediately (99 SEK / 399 SEK). Lifetime is
          1,990 SEK one-time — email billing if the live link is not up yet. We never hold
          your coins.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const plan = PLANS[id];
          const paymentHref = PAYMENT_LINKS[id];
          return (
            <article
              key={id}
              className={`flex flex-col rounded-2xl border p-5 ${
                plan.highlighted
                  ? "border-lime/50 bg-lime/[0.07] shadow-[0_0_80px_rgba(200,255,61,0.08)]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.highlighted && (
                  <span className="text-[11px] uppercase tracking-wider text-lime">Most used</span>
                )}
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
              {paymentHref ? (
                <a href={paymentHref} className={ctaClass(plan.highlighted)}>
                  Unlock {plan.name}
                </a>
              ) : id === "lifetime" && stripeReady ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={checkoutLifetime}
                  className={ctaClass(plan.highlighted, "disabled:cursor-not-allowed disabled:opacity-50")}
                >
                  {busy ? "Redirecting…" : "Unlock Lifetime"}
                </button>
              ) : id === "lifetime" ? (
                <a href={lifetimeMailto()} className={ctaClass(plan.highlighted)}>
                  Email for Lifetime
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
      {error && <p className="mt-4 text-sm text-rose">{error}</p>}
    </section>
  );
}
