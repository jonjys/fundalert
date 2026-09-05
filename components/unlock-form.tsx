"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isGiftCode } from "@/lib/codes";

export function UnlockForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const value = token.trim();
      const gift = isGiftCode(value);
      const res = await fetch(gift ? "/api/access/redeem" : "/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(gift ? { code: value } : { token: value }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Unlock failed");
      router.push("/radar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm text-white/70">
        Gift code
        <textarea
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs outline-none focus:border-lime/50"
          placeholder="FA-XXXXXXXX"
        />
      </label>
      {error && <p className="text-sm text-rose">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
      >
        {busy ? "Checking…" : "Unlock radar"}
      </button>
    </form>
  );
}
