import { hashToken } from "./access";
import { INVITEE_BONUS_MS, INVITER_REWARD_MS } from "./config";
import { tokenFromEntitlementFields } from "./grant";
import {
  getEntitlementByReferralCode,
  getEntitlementBySession,
  patchEntitlement,
} from "./store";
import type { Entitlement } from "./types";

function addTime(expiresAt: number | null, extraMs: number): number | null {
  if (expiresAt === null) return null;
  const base = Math.max(expiresAt, Date.now());
  return base + extraMs;
}

async function persistExpiry(row: Entitlement, expiresAt: number | null): Promise<Entitlement | null> {
  const token = tokenFromEntitlementFields({
    email: row.email,
    plan: row.plan,
    expiresAt,
    stripeSessionId: row.stripeSessionId,
  });
  return patchEntitlement(row.stripeSessionId, {
    expiresAt,
    tokenHash: hashToken(token),
  });
}

/**
 * Apply invitee (+3 days) and inviter (+7 days) extras when a referred session is paid.
 * Stripe coupons / Payment Link metadata.referral dashboard wiring is still TODO.
 */
export async function applyPaidReferral(
  inviteeSessionId: string,
  referralCode: string,
): Promise<Entitlement | null> {
  const invitee = await getEntitlementBySession(inviteeSessionId);
  if (!invitee) return null;

  const code = referralCode.trim().toUpperCase();
  if (!code || invitee.referralCode === code) return invitee;

  const inviter = await getEntitlementByReferralCode(code);
  if (!inviter) return invitee;
  if (inviter.stripeSessionId === invitee.stripeSessionId) return invitee;

  if (!invitee.referredBy) {
    const extended = addTime(invitee.expiresAt, INVITEE_BONUS_MS);
    await persistExpiry(invitee, extended);
    await patchEntitlement(invitee.stripeSessionId, { referredBy: code });

    const inviterExtended = addTime(inviter.expiresAt, INVITER_REWARD_MS);
    await persistExpiry(inviter, inviterExtended);
    await patchEntitlement(inviter.stripeSessionId, {
      referralRewardsGranted: inviter.referralRewardsGranted + 1,
    });
  }

  return getEntitlementBySession(inviteeSessionId);
}
