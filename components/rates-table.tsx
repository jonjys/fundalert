"use client";

import { useEffect, useMemo, useState } from "react";
import { countdown, exchangeLabel, formatPct, formatUsd, fundingTone } from "@/lib/format";
import type { RatesPayload } from "@/lib/types";

function RateValue({ value }: { value: number }) {
  const tone = fundingTone(value);
  const cls =
    tone === "pos" ? "text-lime" : tone === "neg" ? "text-rose" : "text-white/60";
  return <span className={`mono font-medium ${cls}`}>{formatPct(value)}</span>;
}

export function RatesTable({
  initial,
  endpoint,
  locked = false,
}: {
  initial: RatesPayload;
  endpoint: string;
  locked?: boolean;
}) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(() => new Date(initial.fetchedAt).getTime() || 0);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return data.rates;
    return data.rates.filter(
      (row) =>
        row.symbol.includes(q) ||
        row.base.includes(q) ||
        row.exchange.toUpperCase().includes(q),
    );
  }, [data.rates, query]);

  const sourceBits = Object.entries(data.sources).map(([id, status]) => (
    <span key={id} className="inline-flex items-center gap-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === "ok" ? "bg-lime" : "bg-rose"}`}
      />
      {exchangeLabel(id)} {status === "ok" ? "live" : "down"}
    </span>
  ));

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/55">
          <span className="pulse-dot" />
          Funding radar
          <span className="normal-case tracking-normal text-white/40">
            {new Date(data.fetchedAt).toLocaleTimeString()} · sorted by |rate|
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-wider text-white/45">
          {sourceBits}
        </div>
      </div>

      {locked && (
        <div className="border-b border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
          Free view is the top {data.freeLimit} by absolute funding.{" "}
          <a href="#pricing" className="text-lime hover:underline">
            Try 3 days — 29 SEK
          </a>
          .
        </div>
      )}

      <div className="px-4 py-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter BTC, SOL, bybit…"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-lime/50"
        />
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.16em] text-white/40">
            <tr>
              <th className="px-4 py-2 font-medium">Venue</th>
              <th className="px-4 py-2 font-medium">Contract</th>
              <th className="px-4 py-2 font-medium">Funding</th>
              <th className="px-4 py-2 font-medium">APR*</th>
              <th className="px-4 py-2 font-medium">Mark</th>
              <th className="px-4 py-2 font-medium">Next</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={`${row.exchange}-${row.symbol}`}
                className="border-t border-white/5 hover:bg-white/[0.03]"
              >
                <td className="px-4 py-2.5 text-white/70">{exchangeLabel(row.exchange)}</td>
                <td className="mono px-4 py-2.5">{row.symbol}</td>
                <td className="px-4 py-2.5">
                  <RateValue value={row.fundingRatePct} />
                </td>
                <td className="mono px-4 py-2.5 text-white/70">
                  {formatPct(row.annualizedPct, 1)}
                </td>
                <td className="mono px-4 py-2.5 text-white/60">{formatUsd(row.markPrice)}</td>
                <td className="mono px-4 py-2.5 text-white/60">
                  {countdown(row.nextFundingTime, now)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-white/5 md:hidden">
        {filtered.map((row) => (
          <div key={`${row.exchange}-${row.symbol}`} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="mono text-sm">{row.symbol}</div>
                <div className="text-xs text-white/45">{exchangeLabel(row.exchange)}</div>
              </div>
              <RateValue value={row.fundingRatePct} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-white/50">
              <span>APR* {formatPct(row.annualizedPct, 1)}</span>
              <span>{countdown(row.nextFundingTime, now)}</span>
              <span>{formatUsd(row.markPrice)}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-white/50">
          No rows. Venues may be geo-blocking this region, or your filter is too tight.
        </p>
      )}

      {Object.keys(data.errors).length > 0 && (
        <p className="border-t border-white/10 px-4 py-3 text-xs text-white/40">
          Partial data:{" "}
          {Object.entries(data.errors)
            .map(([k, v]) => `${exchangeLabel(k)} — ${v}`)
            .join(" · ")}
        </p>
      )}

      <p className="border-t border-white/10 px-4 py-3 text-[11px] text-white/35">
        Positive funding: longs pay shorts. Negative: shorts pay longs. APR* is the interval
        rate annualized (default 8h) — not a return forecast.
      </p>
    </div>
  );
}
