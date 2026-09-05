"use client";

import { useMemo, useState } from "react";
import {
  inviteShareSnippet,
  inviteShareUrl,
  siteShareUrl,
  telegramShareHref,
  trialShareSnippet,
  twitterShareHref,
} from "@/lib/share";

export function SharePack({
  origin,
  inviteCode = null,
  heading = "Share Trial",
}: {
  origin: string;
  inviteCode?: string | null;
  heading?: string;
}) {
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(() => {
    return inviteCode
      ? inviteShareSnippet(origin, inviteCode, "copy")
      : trialShareSnippet(origin, "copy");
  }, [inviteCode, origin]);

  const xHref = useMemo(() => twitterShareHref(snippet), [snippet]);

  const tgHref = useMemo(() => {
    const url = inviteCode
      ? inviteShareUrl(origin, inviteCode, "telegram")
      : siteShareUrl(origin, "telegram");
    const text = snippet.split("\n\n")[0] ?? snippet;
    return telegramShareHref(url, text);
  }, [inviteCode, origin, snippet]);

  async function copy() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-lime/80">{heading}</p>
      <p className="mt-2 text-sm leading-6 text-white/70">
        One-tap share for X or Telegram. Same Trial link, with a UTM so we can see what
        converted.
      </p>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/50 p-3 text-xs leading-5 text-white/75">
        {snippet}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-black"
        >
          {copied ? "Copied" : "Copy snippet"}
        </button>
        <a
          href={xHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white"
        >
          Share on X
        </a>
        <a
          href={tgHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white"
        >
          Share on Telegram
        </a>
      </div>
    </div>
  );
}
