"use client";

import { useEffect } from "react";
import { PAYMENT_LINKS } from "@/lib/config";

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
      <div className="flex flex-wrap gap-3">
        <a
          href={trialHref}
          className="inline-flex rounded-xl bg-lime px-5 py-3 text-sm font-semibold text-black"
        >
          Trial 29 SEK / 3 days
        </a>
        <a
          href={PAYMENT_LINKS.weekly ?? "/#pricing"}
          className="inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm text-white"
        >
          Weekly 99 SEK
        </a>
      </div>
    </div>
  );
}
