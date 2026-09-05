import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { grantFromCheckoutSession, referralFromCheckoutSession } from "@/lib/grant";
import { applyPaidReferral } from "@/lib/referral";
import { ensureReferralCode, expireBySubscription, extendBySubscription } from "@/lib/store";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const granted = await grantFromCheckoutSession(session);
        if (granted) {
          await ensureReferralCode(granted.entitlement.stripeSessionId);
          const referral = referralFromCheckoutSession(session);
          if (referral) {
            await applyPaidReferral(granted.entitlement.stripeSessionId, referral);
          }
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
        const periodEnd = invoice.lines.data[0]?.period?.end;
        if (subscriptionId && periodEnd) {
          await extendBySubscription(subscriptionId, periodEnd * 1000);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await expireBySubscription(subscription.id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
