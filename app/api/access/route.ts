import { NextResponse } from "next/server";
import { cookieOptions, resolveAccess } from "@/lib/access";
import { ACCESS_COOKIE } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const access = await resolveAccess(jar.get(ACCESS_COOKIE)?.value);
  return NextResponse.json({
    ok: access.ok,
    plan: access.plan,
    email: access.email,
    expiresAt: access.expiresAt,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Paste your access code." }, { status: 400 });
  }
  const access = await resolveAccess(token);
  if (!access.ok || !access.token) {
    return NextResponse.json({ error: "Invalid or expired access code." }, { status: 401 });
  }
  const res = NextResponse.json({
    ok: true,
    plan: access.plan,
    email: access.email,
    expiresAt: access.expiresAt,
  });
  res.cookies.set(ACCESS_COOKIE, access.token, cookieOptions(access.expiresAt));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(Date.now() + 1000), maxAge: 0 });
  return res;
}
