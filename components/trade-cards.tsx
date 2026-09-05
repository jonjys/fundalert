"use client";

import { useEffect, useMemo, useState } from "react";
import { buildTradeCards } from "@/lib/cards";
import { CARD_THRESHOLD_PCT, PAYMENT_LINKS } from "@/lib/config";
import { countdown, exchangeLabel, formatPct } from "@/lib/format";
import type { RatesPayload, TradeCard } from "@/lib/types";

function confidenceTone(value: TradeCard["confidence"]): string {
  if (value === "high") return "border-lime/40 bg-lime/10 text-lime";
  if (value === "med") return "border-amber/40 bg-amber/10 text-amber";
  return "border-white/15 bg-white/5 text-white/65";
}

function TradeCardView({ card, now }: { card: TradeCard; now: number }) {
  const sideCls = card.side === "short" ? "text-rose" : "text-mint";
  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono text-lg font-semibold">{card.symbol}</p>
          <p className="text-xs text-white/45">{exchangeLabel(card.exchange)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${confidenceTone(card.confidence)}`}>
            {card.confidence}
          </span>
          <span className={`text-xs font-semibold uppercase tracking-wider ${sideCls}`}>
            {card.side} perps
          </span>
        </div>
      </div>

      <p className={`mt-3 mono text-xl font-medium ${card.fundingRatePct > 0 ? "text-lime" : "text-rose"}`}>
        {formatPct(card.fundingRatePct)}
      </p>
      <p className="mt-1 text-xs text-white/50">{card.biasLabel}</p>

      <dl className="mt-4 grid gap-2 text-sm text-white/75">
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">Size</dt>
          <dd>{card.sizePct}% of equity</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">24h carry</dt>
          <dd className="mono">{formatPct(card.expected24hPct)} notional</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">APR*</dt>
          <dd className="mono">{formatPct(card.annualizedPct, 1)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">Next print</dt>
          <dd className="mono">{countdown(card.nextFundingTime, now)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm leading-6 text-white/70">
        <span className="text-white/40">Entry · </span>
        {card.entryNote}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/70">
        <span className="text-white/40">Invalidation · </span>
        {card.invalidation}
      </p>
      <p className="mt-auto pt-4 text-[11px] leading-5 text-white/35">{card.disclaimer}</p>
    </article>
  );
}

export function TradeCards({
  initial,
  endpoint,
  locked = false,
  teaser = false,
  max,
}: {
  initial: RatesPayload;
  endpoint: string;
  locked?: boolean;
  teaser?: boolean;
  max?: number;
}) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = window.setInterval(async () => {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return;
        setData((await res.json()) as RatesPayload);
      } catch {
        /* keep last good snapshot */
      }
    }, 45_000);
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(tick);
    };
  }, [endpoint]);

  const cards = useMemo(() => {
    const limit = max ?? (teaser || locked ? 5 : 12);
    const extremes = buildTradeCards(data.rates, {
      thresholdPct: CARD_THRESHOLD_PCT,
      max: limit,
      now,
    });
    if (extremes.length > 0 || !teaser) return extremes;
    return buildTradeCards(data.rates, {
      includeBelowThreshold: true,
      max: limit,
      now,
    });
  }, [data.rates, locked, max, now, teaser]);

  const visible = locked ? cards.slice(0, 2) : cards;
  const blurred = locked ? cards.slice(2) : [];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">
            Trade cards · |funding| ≥ {CARD_THRESHOLD_PCT}%
          </p>
          <p className="mt-1 text-sm text-white/55">
            Classic carry: long when funding is very negative, short when very positive.
            Suggested size is 5–15% of equity, capped. You execute manually.
          </p>
        </div>
        {locked && (
          <div className="flex flex-wrap gap-2">
            <a
              href={PAYMENT_LINKS.trial ?? "/#pricing"}
              className="rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-black"
            >
              Trial 29 SEK / 3 days
            </a>
            <a
              href={PAYMENT_LINKS.weekly ?? "/#pricing"}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white"
            >
              Weekly 99 SEK
            </a>
          </div>
        )}
      </div>

      {cards.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/50">
          No extreme funding right now. The paper track below still shows the last 7 days
          when cards were issued.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((card) => (
          <TradeCardView key={card.id} card={card} now={now} />
        ))}
        {blurred.map((card) => (
          <div key={card.id} className="relative">
            <div className="pointer-events-none select-none blur-sm">
              <TradeCardView card={card} now={now} />
            </div>
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/45">
              <a
                href={PAYMENT_LINKS.trial ?? "/#pricing"}
                className="rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-black"
              >
                Unlock full cards
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
