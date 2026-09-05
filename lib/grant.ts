import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { hashToken, signToken } from "./access";
import { isReferralCode } from "./codes";
import { planFromPriceId, PLANS } from "./config";
import { getStripe, sessionEmail, sessionPaid, sessionPriceId } from "./stripe";
import { getEntitlementBySession, upsertEntitlement } from "./store";
import { isPlanId, type Entitlement, type PlanId } from "./types";

function expiryForPlan(plan: PlanId, subscriptionPeriodEnd: number | null): number | null {
  if (plan === "lifetime") return null;
  if (subscriptionPeriodEnd && subscriptionPeriodEnd > Date.now()) return subscriptionPeriodEnd;
  if (plan === "trial") return Date.now() + 3 * 24 * 60 * 60 * 1000;
  if (plan === "weekly") return Date.now() + 7 * 24 * 60 * 60 * 1000;
  return Date.now() + 32 * 24 * 60 * 60 * 1000;
}

async function subscriptionPeriodEnd(subscriptionId: string | null): Promise<number | null> {
  if (!subscriptionId) return null;
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    const end = sub.items.data[0]?.current_period_end ?? null;
    return end ? end * 1000 : null;
  } catch {
    return null;
  }
}

export async function grantFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ token: string; entitlement: Entitlement } | null> {
  if (!sessionPaid(session)) return null;

  let expanded = session;
  if (!session.line_items) {
    expanded = await getStripe().checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });
  }

  const email = sessionEmail(expanded);
  if (!email) return null;

  const priceId = sessionPriceId(expanded);
  const plan =
    planFromPriceId(priceId) ||
    (isPlanId(expanded.metadata?.plan) ? expanded.metadata.plan : null) ||
    (isPlanId(expanded.client_reference_id) ? expanded.client_reference_id : null);

  if (!plan || !PLANS[plan]) return null;

  const subscriptionId =
    typeof expanded.subscription === "string"
      ? expanded.subscription
      : expanded.subscription?.id ?? null;
  const customerId =
    typeof expanded.customer === "string"
      ? expanded.customer
      : expanded.customer?.id ?? null;

  const periodEnd = await subscriptionPeriodEnd(subscriptionId);
  const existing = await getEntitlementBySession(expanded.id);
  let expiresAt = expiryForPlan(plan, periodEnd);
  if (existing?.expiresAt === null) {
    expiresAt = null;
  } else if (existing?.expiresAt && existing.expiresAt > Date.now()) {
    expiresAt = existing.expiresAt;
  }

  const token = tokenFromEntitlementFields({
    email,
    plan,
    expiresAt,
    stripeSessionId: expanded.id,
  });

  const entitlement = await upsertEntitlement({
    id: existing?.id ?? randomUUID(),
    email,
    plan,
    tokenHash: hashToken(token),
    stripeSessionId: expanded.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    expiresAt,
    createdAt: existing?.createdAt ?? Date.now(),
    telegramChatId: existing?.telegramChatId ?? null,
    telegramThresholdPct: existing?.telegramThresholdPct ?? 0.05,
    telegramEnabled: existing?.telegramEnabled ?? false,
    lastAlertAt: existing?.lastAlertAt ?? null,
    lastAlertKey: existing?.lastAlertKey ?? null,
    referralCode: existing?.referralCode ?? null,
    referredBy: existing?.referredBy ?? null,
    referralRewardsGranted: existing?.referralRewardsGranted ?? 0,
  });

  return { token, entitlement };
}

export function tokenFromEntitlementFields(input: {
  email: string;
  plan: PlanId;
  expiresAt: number | null;
  stripeSessionId: string;
}): string {
  return signToken({
    v: 1,
    email: input.email,
    plan: input.plan,
    exp: input.expiresAt,
    sid: input.stripeSessionId,
  });
}

export function tokenFromEntitlement(entitlement: Entitlement): string {
  return tokenFromEntitlementFields({
    email: entitlement.email,
    plan: entitlement.plan,
    expiresAt: entitlement.expiresAt,
    stripeSessionId: entitlement.stripeSessionId,
  });
}

export function referralFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const meta = session.metadata?.referral?.trim().toUpperCase();
  if (meta && isReferralCode(meta)) return meta;
  const ref = session.client_reference_id?.trim().toUpperCase();
  if (ref && isReferralCode(ref) && !isPlanId(ref)) return ref;
  return null;
}
