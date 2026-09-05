import { NextResponse } from "next/server";
import { isReferralCode } from "@/lib/codes";
import { REFERRAL_COOKIE, referralCookieOptions } from "@/lib/http";
import { getEntitlementByReferralCode } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim().toUpperCase() ?? "";
  if (!isReferralCode(code)) {
    return NextResponse.json({ error: "Invalid invite code." }, { status: 400 });
  }

  let known = false;
  try {
    known = Boolean(await getEntitlementByReferralCode(code));
  } catch {
    known = false;
  }

  const res = NextResponse.json({
    ok: true,
    code,
    known,
    inviteeBonusDays: 3,
    inviterRewardDays: 7,
  });
  res.cookies.set(REFERRAL_COOKIE, code, referralCookieOptions());
  return res;
}
