"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BILLING_EMAIL, PLANS } from "@/lib/config";
import type { PlanId } from "@/lib/types";

type ClaimOk = {
  sessionId: string;
  plan: PlanId;
  email: string;
  expiresAt: number | null;
  inviteCode: string | null;
};

type ClaimErr = {
  error: string;
  code?: string;
  sessionId?: string | null;
};

function billingMailto(sessionId: string | null, plan: PlanId | null) {
  const subject = encodeURIComponent(
    `Fundalert ${plan ? PLANS[plan].name : "payment"} — need access`,
  );
  const body = encodeURIComponent(
    sessionId
      ? `I paid but could not activate.\n\nStripe session: ${sessionId}\n`
      : "I paid but the return link had no session_id. Here is my Stripe receipt:\n",
  );
  return `mailto:${BILLING_EMAIL}?subject=${subject}&body=${body}`;
}

export function PaidReturnNotice({
  plan,
  sessionId,
  initialClaim = null,
  initialError = null,
}: {
  plan: PlanId | null;
  sessionId: string | null;
  initialClaim?: ClaimOk | null;
  initialError?: ClaimErr | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"claiming" | "ready" | "error" | "idle">(
    initialClaim ? "ready" : initialError ? "error" : sessionId ? "claiming" : "idle",
  );
  const [claim, setClaim] = useState<ClaimOk | null>(initialClaim);
  const [error, setError] = useState<ClaimErr | null>(initialError);
  const [busy, setBusy] = useState<"activate" | "gift" | "invite" | null>(null);
  const [gift, setGift] = useState<{ code: string; expiresAt: number } | null>(null);
  const [giftCopied, setGiftCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    if (!sessionId || initialClaim || initialError) return;
    let cancelled = false;
    void fetch("/api/access/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (res) => {
        const json = (await res.json()) as ClaimOk & ClaimErr;
        if (cancelled) return;
        if (!res.ok) {
          setError({ error: json.error || "Could not verify payment.", code: json.code, sessionId });
          setStatus("error");
          return;
        }
        setClaim(json);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setError({
          error: "Could not reach the claim API. Email billing with your session id.",
          sessionId,
        });
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, initialClaim, initialError]);

  const resolvedPlan = claim?.plan ?? plan;
  const inviteUrl = useMemo(() => {
    const code = claim?.inviteCode;
    if (!code || typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${code}`;
  }, [claim?.inviteCode]);

  async function activate() {
    if (!sessionId) return;
    setBusy("activate");
    try {
      const res = await fetch("/api/access/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = (await res.json()) as ClaimErr;
      if (!res.ok) throw new Error(json.error || "Activate failed");
      router.push("/signals");
      router.refresh();
    } catch (err) {
      setError({
        error: err instanceof Error ? err.message : "Activate failed",
        sessionId,
      });
      setStatus("error");
      setBusy(null);
    }
  }

  async function giftAccess() {
    if (!sessionId) return;
    setBusy("gift");
    try {
      const res = await fetch("/api/access/gift", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = (await res.json()) as { code?: string; expiresAt?: number; error?: string };
      if (!res.ok || !json.code || !json.expiresAt) {
        throw new Error(json.error || "Could not create a gift code");
      }
      setGift({ code: json.code, expiresAt: json.expiresAt });
    } catch (err) {
      setError({
        error: err instanceof Error ? err.message : "Gift failed",
        sessionId,
      });
    } finally {
      setBusy(null);
    }
  }

  function openInvite() {
    setInviteOpen(true);
    setBusy(null);
  }

  async function copy(text: string, kind: "gift" | "invite") {
    await navigator.clipboard.writeText(text);
    if (kind === "gift") setGiftCopied(true);
    else setInviteCopied(true);
  }

  return (
    <aside
      id="paid"
      className="mb-10 rounded-2xl border border-lime/40 bg-lime/[0.08] px-5 py-5"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-lime/80">Checkout</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">
        {status === "ready"
          ? `${resolvedPlan ? PLANS[resolvedPlan].name : "Payment"} confirmed`
          : status === "error"
            ? "Payment could not be unlocked"
            : sessionId
              ? "Checking your payment"
              : "Return link is incomplete"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/75">
        Tips and optional alerts only — no custody, no auto-trade, not financial advice.
        {status === "ready" && claim?.email
          ? ` Receipt email: ${claim.email}.`
          : ""}
      </p>

      {status === "claiming" && (
        <p className="mt-3 text-sm text-white/60">Verifying the Stripe session…</p>
      )}

      {status === "idle" && (
        <div className="mt-4 space-y-3 text-sm leading-6 text-white/70">
          <p>
            This page did not receive a <span className="text-white">session_id</span>, so we
            cannot verify payment or activate this browser. We are not unlocking the radar.
          </p>
          <p>
            Set the Payment Link after-completion URL to{" "}
            <span className="text-white">
              /?paid=trial&session_id={"{CHECKOUT_SESSION_ID}"}
            </span>{" "}
            and try the return link again, or email billing with your Stripe receipt.
          </p>
          <a
            href={billingMailto(null, plan)}
            className="inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-white"
          >
            Email {BILLING_EMAIL}
          </a>
        </div>
      )}

      {status === "error" && error && (
        <div className="mt-4 space-y-3 text-sm leading-6 text-white/70">
          <p className="text-rose">{error.error}</p>
          {(error.sessionId || sessionId) && (
            <p className="font-mono text-xs text-white/55">
              Session: {error.sessionId || sessionId}
            </p>
          )}
          <a
            href={billingMailto(error.sessionId || sessionId, resolvedPlan)}
            className="inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-white"
          >
            Email billing with session id
          </a>
        </div>
      )}

      {status === "ready" && claim && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-6 text-white/70">
            Choose how to continue. This browser is not unlocked until you pick{" "}
            <span className="text-white">Use Fundalert now</span>.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void activate()}
              disabled={busy !== null}
              className="rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
            >
              {busy === "activate" ? "Activating…" : "Use Fundalert now"}
            </button>
            <button
              type="button"
              onClick={() => void giftAccess()}
              disabled={busy !== null}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white disabled:opacity-50"
            >
              {busy === "gift" ? "Creating…" : "Gift access"}
            </button>
            <button
              type="button"
              onClick={openInvite}
              disabled={busy !== null || !claim.inviteCode}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white disabled:opacity-50"
            >
              Invite & earn
            </button>
          </div>
          <p className="text-xs leading-5 text-white/45">
            Activate on this device · Gift / Share code (48h, single-use) · Invite user
          </p>

          {gift && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                Gift / Share code
              </p>
              <p className="mt-2 text-sm text-white/70">
                Single-use, expires{" "}
                {new Date(gift.expiresAt).toLocaleString()}. After redeem it is
                invalid. We cannot show this code again.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-lg tracking-[0.2em] text-lime">
                {gift.code}
              </pre>
              <button
                type="button"
                onClick={() => void copy(gift.code, "gift")}
                className="mt-3 rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-black"
              >
                {giftCopied ? "Copied" : "Copy gift code"}
              </button>
            </div>
          )}

          {inviteOpen && inviteUrl && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Invite user</p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Invitee gets +3 days when they pay. You get +7 days when they pay.
                Extra time is applied in Fundalert when we see their paid session.
                Stripe coupons / dashboard referral metadata are not live yet.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-xs text-lime/90">
                {inviteUrl}
              </pre>
              <button
                type="button"
                onClick={() => void copy(inviteUrl, "invite")}
                className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-sm text-white"
              >
                {inviteCopied ? "Copied" : "Copy invite link"}
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
