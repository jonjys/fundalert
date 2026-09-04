import Link from "next/link";
import { ActivateAccess } from "@/components/activate-access";
import { grantFromCheckoutSession } from "@/lib/grant";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Missing checkout session</h1>
        <p className="mt-3 text-white/60">
          If you paid, open the success link from Stripe or paste your access code on{" "}
          <Link href="/unlock" className="text-lime">
            /unlock
          </Link>
          .
        </p>
      </main>
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Stripe is not configured</h1>
        <p className="mt-3 text-white/60">
          Set STRIPE_SECRET_KEY to redeem checkout sessions.
        </p>
      </main>
    );
  }

  let token: string | null = null;
  let plan: string | null = null;
  let email: string | null = null;
  let error: string | null = null;
  let unpaid = false;

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price"],
    });
    const granted = await grantFromCheckoutSession(session);
    if (!granted) {
      unpaid = true;
    } else {
      token = granted.token;
      plan = granted.entitlement.plan;
      email = granted.entitlement.email;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Could not redeem session</h1>
        <p className="mt-3 text-sm text-white/60">{error}</p>
      </main>
    );
  }

  if (unpaid || !token || !plan || !email) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Payment not complete</h1>
        <p className="mt-3 text-white/60">
          Stripe has not marked this session as paid yet. If you just finished Checkout,
          wait a few seconds and refresh. Do not share unpaid session ids.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-lime/80">You are in</p>
      <h1 className="mt-2 text-3xl font-semibold">Access unlocked</h1>
      <p className="mt-3 text-sm leading-6 text-white/60">
        Plan <span className="text-white">{plan}</span> for{" "}
        <span className="text-white">{email}</span>. Save this code — we store only a
        hash. Informational tool only; not financial advice.
      </p>
      <ActivateAccess token={token} />
      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/radar" className="text-lime hover:underline">
          Open radar
        </Link>
        <Link href="/alerts" className="text-white/70 hover:underline">
          Alert settings
        </Link>
      </div>
    </main>
  );
}
