import { cookies } from "next/headers";
import { claimPaidCheckoutSession } from "@/lib/claim";
import { REFERRAL_COOKIE } from "@/lib/config";
import { publicClaim } from "@/lib/http";
import type { PlanId } from "@/lib/types";
import { PaidReturnNotice } from "./paid-return";

export async function PaidReturn({
  plan,
  sessionId,
}: {
  plan: PlanId | null;
  sessionId: string | null;
}) {
  let initialClaim = null;
  let initialError = null;
  if (sessionId) {
    const jar = await cookies();
    const outcome = await claimPaidCheckoutSession(
      sessionId,
      jar.get(REFERRAL_COOKIE)?.value ?? null,
    );
    if (outcome.ok) {
      initialClaim = publicClaim(outcome.result);
    } else {
      initialError = {
        error: outcome.failure.error,
        code: outcome.failure.code,
        sessionId: outcome.failure.sessionId ?? sessionId,
      };
    }
  }

  return (
    <PaidReturnNotice
      plan={plan}
      sessionId={sessionId}
      initialClaim={initialClaim}
      initialError={initialError}
    />
  );
}
