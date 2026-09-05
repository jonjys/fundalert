import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/config";
import { claimPaidCheckoutSession } from "@/lib/claim";
import { createGiftForSession } from "@/lib/gift";
import { verifyToken } from "@/lib/access";
import { claimErrorResponse, REFERRAL_COOKIE } from "@/lib/http";
import { getEntitlementBySession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { sessionId?: string; session_id?: string }
    | null;
  const jar = await cookies();
  const cookieToken = jar.get(ACCESS_COOKIE)?.value;
  const cookieSid = cookieToken ? verifyToken(cookieToken)?.sid ?? null : null;
  const sessionId = body?.sessionId || body?.session_id || cookieSid || null;

  if (cookieSid && sessionId === cookieSid) {
    const entitlement = await getEntitlementBySession(cookieSid);
    if (entitlement) {
      const { code, gift } = await createGiftForSession(entitlement);
      return NextResponse.json({
        code,
        plan: gift.plan,
        expiresAt: gift.expiresAt,
        singleUse: true,
      });
    }
  }

  const outcome = await claimPaidCheckoutSession(sessionId, jar.get(REFERRAL_COOKIE)?.value ?? null);
  if (!outcome.ok) return claimErrorResponse(outcome.failure);

  const entitlement = await getEntitlementBySession(outcome.result.sessionId);
  if (!entitlement) {
    return NextResponse.json(
      { error: "Payment is confirmed, but the entitlement row is missing. Email billing." },
      { status: 409 },
    );
  }

  const { code, gift } = await createGiftForSession(entitlement);
  return NextResponse.json({
    code,
    plan: gift.plan,
    expiresAt: gift.expiresAt,
    singleUse: true,
  });
}
