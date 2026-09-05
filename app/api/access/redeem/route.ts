import { NextResponse } from "next/server";
import { redeemGiftCode } from "@/lib/gift";
import { withAccessCookie } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Paste a gift code." }, { status: 400 });
  }
  const redeemed = await redeemGiftCode(code);
  if (!redeemed.ok) {
    return NextResponse.json({ error: redeemed.error }, { status: redeemed.status });
  }
  return withAccessCookie(
    {
      ok: true,
      plan: redeemed.entitlement.plan,
      email: redeemed.entitlement.email,
      expiresAt: redeemed.entitlement.expiresAt,
    },
    redeemed.token,
    redeemed.entitlement.expiresAt,
  );
}
