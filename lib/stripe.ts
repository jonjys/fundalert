import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

export function integrationIdentifier(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += letters[Math.floor(Math.random() * letters.length)];
  }
  return `fundalert-web-${suffix}`;
}

export function sessionPaid(session: Stripe.Checkout.Session): boolean {
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
    return true;
  }
  return session.status === "complete";
}

export function sessionEmail(session: Stripe.Checkout.Session): string | null {
  const email =
    session.customer_details?.email ||
    session.customer_email ||
    null;
  return email ? email.trim().toLowerCase() : null;
}

export function sessionPriceId(session: Stripe.Checkout.Session): string | null {
  const items = session.line_items?.data ?? [];
  const price = items[0]?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}
