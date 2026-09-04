import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { hashToken, signToken } from "./access";
import { planFromPriceId, PLANS } from "./config";
import { getStripe, sessionEmail, sessionPaid, sessionPriceId } from "./stripe";
import { getEntitlementBySession, upsertEntitlement } from "./store";
import type { Entitlement, PlanId } from "./types";

function expiryForPlan(plan: PlanId, subscriptionPeriodEnd: number | null): number | null {
  if (plan === "lifetime") return null;
  if (subscriptionPeriodEnd && subscriptionPeriodEnd > Date.now()) return subscriptionPeriodEnd;
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
    (expanded.metadata?.plan as PlanId | undefined) ||
    (expanded.client_reference_id as PlanId | undefined);

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
  const expiresAt = expiryForPlan(plan, periodEnd);
  const existing = await getEntitlementBySession(expanded.id);
  const payload = {
    v: 1 as const,
    email,
    plan,
    exp: expiresAt,
    sid: expanded.id,
  };
  const token = signToken(payload);

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
  });

  return { token, entitlement };
}
