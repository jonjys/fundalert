"use client";

import { useState } from "react";

export function GiftAccess() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gift, setGift] = useState<{ code: string; expiresAt: number } | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/access/gift", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as { code?: string; expiresAt?: number; error?: string };
      if (!res.ok || !json.code || !json.expiresAt) {
        throw new Error(json.error || "Could not create a gift code");
      }
      setGift({ code: json.code, expiresAt: json.expiresAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gift failed");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!gift) return;
    await navigator.clipboard.writeText(gift.code);
    setCopied(true);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-lime/80">Gift access</p>
      <p className="mt-2 text-sm leading-6 text-white/70">
        Mint a 48-hour single-use code from this unlocked browser. Previous unused codes
        for this purchase are replaced.
      </p>
      <button
        type="button"
        onClick={() => void create()}
        disabled={busy}
        className="mt-3 rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create gift code"}
      </button>
      {error && <p className="mt-3 text-sm text-rose">{error}</p>}
      {gift && (
        <div className="mt-4">
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-lg tracking-[0.2em] text-lime">
            {gift.code}
          </pre>
          <p className="mt-2 text-xs text-white/45">
            Expires {new Date(gift.expiresAt).toLocaleString()}. We cannot show this
            code again.
          </p>
          <button
            type="button"
            onClick={() => void copy()}
            className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-sm text-white"
          >
            {copied ? "Copied" : "Copy gift code"}
          </button>
        </div>
      )}
    </div>
  );
}
