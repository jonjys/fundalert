import Link from "next/link";
import { ActivateAccess } from "@/components/activate-access";
import { PaidReturnNotice } from "@/components/paid-return";
import { grantFromCheckoutSession } from "@/lib/grant";
import { getStripe } from "@/lib/stripe";
import { isPlanId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; paid?: string }>;
}) {
  const { session_id: sessionId, paid } = await searchParams;
  const paidPlan = isPlanId(paid) ? paid : null;

  if (!sessionId) {
    if (paidPlan) {
      return (
        <main className="mx-auto max-w-xl px-4 py-16">
          <PaidReturnNotice plan={paidPlan} />
        </main>
      );
    }
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
        {paidPlan ? (
          <PaidReturnNotice plan={paidPlan} />
        ) : (
          <>
            <h1 className="text-3xl font-semibold">Payment received</h1>
            <p className="mt-3 text-white/60">
              Checkout finished. Automatic access-code minting needs a Stripe secret on
              the server. Open the radar, or email billing@nyttolabs.com with your receipt
              if the book is still locked. Trial is 3 days of full-book access.
            </p>
            <div className="mt-6 flex gap-4 text-sm">
              <Link href="/radar" className="text-lime hover:underline">
                Open radar
              </Link>
              <Link href="/unlock" className="text-white/70 hover:underline">
                Unlock with a code
              </Link>
            </div>
          </>
        )}
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
        {paidPlan && (
          <div className="mt-8">
            <PaidReturnNotice plan={paidPlan} />
          </div>
        )}
      </main>
    );
  }

  if (unpaid || !token || !plan || !email) {
    if (paidPlan) {
      return (
        <main className="mx-auto max-w-xl px-4 py-16">
          <PaidReturnNotice plan={paidPlan} />
        </main>
      );
    }
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
        <span className="text-white">{email}</span>
        {plan === "trial" ? " — 3-day full-book access." : "."} Save this code — we store
        only a hash. Informational tool only; not financial advice.
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
