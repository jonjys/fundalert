import Link from "next/link";
import { PaidReturn } from "@/components/paid-return-loader";
import { isPlanId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; paid?: string }>;
}) {
  const { session_id: sessionId, paid } = await searchParams;
  const paidPlan = isPlanId(paid) ? paid : null;

  if (!sessionId && !paidPlan) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Missing checkout session</h1>
        <p className="mt-3 text-white/60">
          If you paid, open the Stripe return link (it must include{" "}
          <span className="text-white">session_id</span>) or redeem a gift code on{" "}
          <Link href="/unlock" className="text-lime">
            /unlock
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <PaidReturn plan={paidPlan} sessionId={sessionId ?? null} />
    </main>
  );
}
