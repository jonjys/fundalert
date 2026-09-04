"use client";

import { useEffect, useState } from "react";

export function ActivateAccess({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    void fetch("/api/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((res) => setArmed(res.ok));
  }, [token]);

  async function copy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
  }

  return (
    <div className="mt-8 space-y-4">
      <p className="text-sm text-white/60">
        {armed
          ? "This browser is unlocked. Save the code for other devices."
          : "Saving access cookie…"}
      </p>
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[11px] leading-5 text-lime/90">
        {token}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-black"
      >
        {copied ? "Copied" : "Copy access code"}
      </button>
    </div>
  );
}
