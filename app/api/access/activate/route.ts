import { cookies } from "next/headers";
import { claimPaidCheckoutSession } from "@/lib/claim";
import { claimErrorResponse, publicClaim, REFERRAL_COOKIE, withAccessCookie } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { sessionId?: string; session_id?: string }
    | null;
  const sessionId = body?.sessionId || body?.session_id || null;
  const jar = await cookies();
  const outcome = await claimPaidCheckoutSession(sessionId, jar.get(REFERRAL_COOKIE)?.value ?? null);
  if (!outcome.ok) return claimErrorResponse(outcome.failure);
  return withAccessCookie(
    { ok: true, ...publicClaim(outcome.result) },
    outcome.result.token,
    outcome.result.expiresAt,
  );
}
