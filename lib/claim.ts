import { accessSecret } from "./config";
import { isCheckoutSessionId } from "./codes";
import {
  grantFromCheckoutSession,
  referralFromCheckoutSession,
  tokenFromEntitlement,
} from "./grant";
import { applyPaidReferral } from "./referral";
import { ensureReferralCode } from "./store";
import { getStripe, sessionEmail, sessionPaid } from "./stripe";
import type { PlanId } from "./types";

export type ClaimSuccess = {
  sessionId: string;
  plan: PlanId;
  email: string;
  expiresAt: number | null;
  inviteCode: string | null;
};

export type ClaimGrant = ClaimSuccess & { token: string };

export type ClaimFailure = {
  error: string;
  code:
    | "missing_session"
    | "invalid_session"
    | "not_configured"
    | "unpaid"
    | "no_email"
    | "grant_failed"
    | "stripe_error";
  status: number;
  sessionId?: string;
};

export type ClaimOutcome =
  | { ok: true; result: ClaimGrant }
  | { ok: false; failure: ClaimFailure };

function fail(
  code: ClaimFailure["code"],
  error: string,
  status: number,
  sessionId?: string,
): ClaimOutcome {
  return { ok: false, failure: { error, code, status, sessionId } };
}

export function claimConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && accessSecret());
}

export async function claimPaidCheckoutSession(
  sessionId: string | null | undefined,
  referralHint?: string | null,
): Promise<ClaimOutcome> {
  const sid = sessionId?.trim() ?? "";
  if (!sid) {
    return fail(
      "missing_session",
      "Missing checkout session. Ask Stripe to return session_id on the Payment Link, or email billing with your receipt.",
      400,
    );
  }
  if (!isCheckoutSessionId(sid)) {
    return fail("invalid_session", "That does not look like a Stripe checkout session id.", 400, sid);
  }
  if (!claimConfigured()) {
    return fail(
      "not_configured",
      "This server cannot verify payment. Set STRIPE_SECRET_KEY and ACCESS_TOKEN_SECRET (or STRIPE_WEBHOOK_SECRET) on Vercel, then reopen your success link. Do not assume the radar is unlocked.",
      503,
      sid,
    );
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sid, {
      expand: ["line_items.data.price"],
    });
    if (!sessionPaid(session)) {
      return fail(
        "unpaid",
        "Stripe has not marked this session as paid yet. Wait a few seconds and refresh, or email billing with this session id.",
        409,
        sid,
      );
    }

    const granted = await grantFromCheckoutSession(session);
    if (!granted) {
      if (!sessionEmail(session)) {
        return fail(
          "no_email",
          "Payment is marked paid, but Stripe has no email on the session. Email billing with this session id so we can mint access.",
          422,
          sid,
        );
      }
      return fail(
        "grant_failed",
        "Payment is marked paid, but we could not map it to a Trial/Weekly/Pro/Lifetime plan. Email billing with this session id.",
        422,
        sid,
      );
    }

    const inviteCode = await ensureReferralCode(granted.entitlement.stripeSessionId);
    const referral =
      referralHint?.trim().toUpperCase() || referralFromCheckoutSession(session) || null;
    const afterReferral = referral
      ? await applyPaidReferral(granted.entitlement.stripeSessionId, referral)
      : granted.entitlement;

    const token = afterReferral ? tokenFromEntitlement(afterReferral) : granted.token;

    return {
      ok: true,
      result: {
        sessionId: granted.entitlement.stripeSessionId,
        plan: afterReferral?.plan ?? granted.entitlement.plan,
        email: afterReferral?.email ?? granted.entitlement.email,
        expiresAt: afterReferral?.expiresAt ?? granted.entitlement.expiresAt,
        inviteCode: afterReferral?.referralCode ?? inviteCode,
        token,
      },
    };
  } catch (err) {
    return fail(
      "stripe_error",
      err instanceof Error ? err.message : "Stripe could not load this checkout session.",
      502,
      sid,
    );
  }
}
