import { NextResponse } from "next/server";
import { cookieOptions } from "./access";
import { ACCESS_COOKIE, REFERRAL_COOKIE } from "./config";
import type { ClaimFailure, ClaimGrant } from "./claim";

export function publicClaim(result: ClaimGrant) {
  return {
    sessionId: result.sessionId,
    plan: result.plan,
    email: result.email,
    expiresAt: result.expiresAt,
    inviteCode: result.inviteCode,
  };
}

export function claimErrorResponse(failure: ClaimFailure) {
  return NextResponse.json(
    {
      error: failure.error,
      code: failure.code,
      sessionId: failure.sessionId ?? null,
    },
    { status: failure.status },
  );
}

export function withAccessCookie(body: unknown, token: string, expiresAt: number | null) {
  const res = NextResponse.json(body);
  res.cookies.set(ACCESS_COOKIE, token, cookieOptions(expiresAt));
  return res;
}

export function referralCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  };
}

export { REFERRAL_COOKIE };
