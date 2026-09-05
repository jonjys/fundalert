import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, accessSecret } from "./config";
import type { AccessState, PlanId, TokenPayload } from "./types";
import { getEntitlementBySession } from "./store";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString(
    "utf8",
  );
}

export function signToken(payload: TokenPayload): string {
  const secret = accessSecret();
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET or STRIPE_WEBHOOK_SECRET is required to sign access tokens");
  }
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`fa1.${body}`).digest("hex");
  return `fa1.${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const secret = accessSecret();
  if (!secret || !token.startsWith("fa1.")) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [, body, sig] = parts;
  const expected = createHmac("sha256", secret).update(`fa1.${body}`).digest("hex");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(body)) as TokenPayload;
    if (payload.v !== 1 || !payload.email || !payload.plan || !payload.sid) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function resolveAccess(token: string | null | undefined): Promise<AccessState> {
  const free: AccessState = {
    ok: false,
    plan: "free",
    email: null,
    expiresAt: null,
    token: null,
    referralCode: null,
  };
  if (!token) return free;
  const payload = verifyToken(token);
  if (!payload) return free;

  let expiresAt = payload.exp;
  let plan: PlanId = payload.plan;
  let referralCode: string | null = null;
  try {
    const stored = await getEntitlementBySession(payload.sid);
    if (stored) {
      expiresAt = stored.expiresAt;
      plan = stored.plan;
      referralCode = stored.referralCode;
    }
  } catch {
    // Store is optional for HMAC access.
  }

  if (expiresAt && expiresAt < Date.now()) return free;
  return {
    ok: true,
    plan,
    email: payload.email,
    expiresAt,
    token,
    referralCode,
  };
}

export async function getAccessFromCookies(): Promise<AccessState> {
  const jar = await cookies();
  return resolveAccess(jar.get(ACCESS_COOKIE)?.value);
}

export function cookieOptions(expiresAt: number | null) {
  const maxAge = expiresAt
    ? Math.max(60, Math.floor((expiresAt - Date.now()) / 1000))
    : 60 * 60 * 24 * 365 * 5;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
