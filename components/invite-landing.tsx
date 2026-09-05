"use client";

import { useEffect } from "react";

export function InviteLanding({
  code,
  known,
  trialHref,
}: {
  code: string;
  known: boolean;
  trialHref: string;
}) {
  useEffect(() => {
    void fetch("/api/invite/bind", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
  }, [code]);

  return (
    <div className="mt-8 space-y-4">
      <p className="font-mono text-sm text-white/70">Invite {code}</p>
      {!known && (
        <p className="text-sm text-white/50">
          We could not look up this invite in the store (Turso may be unset). The referral
          cookie is still saved on this browser.
        </p>
      )}
      <a
        href={trialHref}
        className="inline-flex rounded-xl bg-lime px-5 py-3 text-sm font-semibold text-black"
      >
        Start 3-day trial — 29 SEK
      </a>
    </div>
  );
}
