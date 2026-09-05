import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { claimPaidCheckoutSession } from "@/lib/claim";
import { claimErrorResponse, publicClaim, REFERRAL_COOKIE } from "@/lib/http";

export const dynamic = "force-dynamic";

async function readSessionId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("sessionId") || url.searchParams.get("session_id");
  if (fromQuery) return fromQuery;
  if (request.method === "GET") return null;
  const body = (await request.json().catch(() => null)) as
    | { sessionId?: string; session_id?: string }
    | null;
  return body?.sessionId || body?.session_id || null;
}

async function handle(request: Request) {
  const jar = await cookies();
  const referralHint = jar.get(REFERRAL_COOKIE)?.value ?? null;
  const outcome = await claimPaidCheckoutSession(await readSessionId(request), referralHint);
  if (!outcome.ok) return claimErrorResponse(outcome.failure);
  return NextResponse.json(publicClaim(outcome.result));
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
