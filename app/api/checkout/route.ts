import { NextResponse } from "next/server";
import { appUrl, isStripeConfigured, PLANS, priceIdForPlan } from "@/lib/config";
import { getStripe, integrationIdentifier } from "@/lib/stripe";
import { isPlanId, type PlanId } from "@/lib/types";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_* env vars.",
      },
      { status: 503 },
    );
  }

  let plan: PlanId | null = null;
  try {
    const body = (await request.json()) as { plan?: string };
    if (isPlanId(body.plan)) {
      plan = body.plan;
    }
  } catch {
    plan = null;
  }
  if (!plan) {
    return NextResponse.json({ error: "Choose trial, weekly, pro, or lifetime." }, { status: 400 });
  }

  const price = priceIdForPlan(plan);
  if (!price) {
    return NextResponse.json({ error: `Missing price id for ${plan}` }, { status: 500 });
  }

  const origin = request.headers.get("origin") || appUrl();
  const stripe = getStripe();
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: PLANS[plan].mode,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#pricing`,
    allow_promotion_codes: true,
    client_reference_id: plan,
    metadata: { plan, product: "fundalert" },
    integration_identifier: integrationIdentifier(),
  };
  if (PLANS[plan].mode === "payment") {
    params.customer_creation = "always";
  }

  const session = await stripe.checkout.sessions.create(params);
  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }
  return NextResponse.json({ url: session.url, id: session.id });
}
