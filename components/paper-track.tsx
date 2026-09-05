import { formatPct } from "@/lib/format";
import type { PaperTrackSummary } from "@/lib/types";

function outcomeLabel(outcome: PaperTrackSummary["rows"][number]["outcome"]): string {
  if (outcome === "win") return "Win";
  if (outcome === "lose") return "Lose";
  if (outcome === "flat") return "Flat";
  if (outcome === "expired") return "Expired";
  return "Open";
}

export function PaperTrack({ track }: { track: PaperTrackSummary }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-amber">
            Paper track record · last {track.windowDays} days · simulated
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/45">{track.rule}</p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-white/40">Issued</dt>
            <dd className="mt-1 font-medium">{track.issued}</dd>
          </div>
          <div>
            <dt className="text-white/40">W–L</dt>
            <dd className="mt-1 font-medium">
              {track.wins}–{track.losses}
              {track.winRate != null ? ` · ${track.winRate.toFixed(0)}%` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Σ paper</dt>
            <dd className="mt-1 font-medium">
              {track.sumPnlPct == null ? "—" : formatPct(track.sumPnlPct, 2)}
            </dd>
          </div>
        </dl>
      </div>

      {track.rows.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">
          No paper cards yet. Cron issues a snapshot when |funding| is extreme and marks
          it after 8 hours. Empty is expected on a fresh book.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              <tr>
                <th className="px-2 py-2 font-medium">Issued</th>
                <th className="px-2 py-2 font-medium">Contract</th>
                <th className="px-2 py-2 font-medium">Side</th>
                <th className="px-2 py-2 font-medium">Funding</th>
                <th className="px-2 py-2 font-medium">Mark</th>
                <th className="px-2 py-2 font-medium">Paper</th>
              </tr>
            </thead>
            <tbody>
              {track.rows.slice(0, 12).map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-2 py-2 text-white/55">
                    {new Date(row.issuedAt).toLocaleString()}
                  </td>
                  <td className="mono px-2 py-2">
                    {row.symbol}
                    <span className="ml-2 text-xs text-white/40">{row.exchange}</span>
                  </td>
                  <td className="px-2 py-2 uppercase text-white/70">{row.side}</td>
                  <td className="mono px-2 py-2">{formatPct(row.fundingRatePct)}</td>
                  <td className="px-2 py-2 text-white/70">{outcomeLabel(row.outcome)}</td>
                  <td className="mono px-2 py-2">
                    {row.pnlPct == null ? "—" : formatPct(row.pnlPct, 3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
