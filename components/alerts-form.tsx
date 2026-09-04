"use client";

import { useState } from "react";

type Settings = {
  botConfigured: boolean;
  telegramChatId: string;
  telegramThresholdPct: number;
  telegramEnabled: boolean;
  storePersisted: boolean;
};

export function AlertsForm({ initial }: { initial: Settings }) {
  const [chatId, setChatId] = useState(initial.telegramChatId);
  const [threshold, setThreshold] = useState(String(initial.telegramThresholdPct));
  const [enabled, setEnabled] = useState(initial.telegramEnabled);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(test: boolean) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          telegramChatId: chatId,
          telegramThresholdPct: Number(threshold),
          telegramEnabled: enabled,
          test,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        test?: { ok?: boolean; error?: string };
      };
      if (!res.ok) throw new Error(json.error || "Save failed");
      if (test) {
        if (json.test?.ok) setStatus("Test message sent.");
        else setStatus(json.test?.error || "Saved, but test send did not go out.");
      } else {
        setStatus("Saved.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {!initial.botConfigured && (
        <div className="rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          <code className="mono">TELEGRAM_BOT_TOKEN</code> is not set. You can still save a
          chat id. The cron job will no-op until a bot token exists. See README for BotFather
          setup.
        </div>
      )}
      {!initial.storePersisted && (
        <div className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
          Access is unlocked, but this environment has no entitlement row yet (common right
          after checkout if the webhook has not run, or on Vercel without Turso). Complete
          checkout, wait for the webhook, or set <code className="mono">TURSO_DATABASE_URL</code>.
        </div>
      )}
      <label className="block text-sm text-white/70">
        Telegram chat id
        <input
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-lime/50"
          placeholder="123456789"
        />
      </label>
      <label className="block text-sm text-white/70">
        Alert when |funding| exceeds (%)
        <input
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-lime/50"
          placeholder="0.05"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enable alerts
      </label>
      {error && <p className="text-sm text-rose">{error}</p>}
      {status && <p className="text-sm text-mint">{status}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => save(false)}
          className="rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          Save settings
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save(true)}
          className="rounded-xl border border-white/15 px-4 py-3 text-sm text-white disabled:opacity-50"
        >
          Save + test ping
        </button>
      </div>
    </div>
  );
}
