import { randomUUID } from "node:crypto";
import { hashToken } from "./access";
import { isGiftCode, newGiftCode, normalizeGiftCode } from "./codes";
import { GIFT_TTL_MS } from "./config";
import { tokenFromEntitlement } from "./grant";
import { getEntitlementBySession, getGiftByHash, insertGiftCode, markGiftRedeemed } from "./store";
import type { Entitlement, GiftCode } from "./types";

export async function createGiftForSession(
  entitlement: Entitlement,
): Promise<{ code: string; gift: GiftCode }> {
  const code = newGiftCode();
  const gift = await insertGiftCode({
    id: randomUUID(),
    codeHash: hashToken(normalizeGiftCode(code)),
    stripeSessionId: entitlement.stripeSessionId,
    plan: entitlement.plan,
    email: entitlement.email,
    expiresAt: Date.now() + GIFT_TTL_MS,
    createdAt: Date.now(),
    redeemedAt: null,
  });
  return { code, gift };
}

export async function redeemGiftCode(rawCode: string): Promise<
  | { ok: true; token: string; entitlement: Entitlement; expiresAt: number }
  | { ok: false; error: string; status: number }
> {
  const code = normalizeGiftCode(rawCode);
  if (!isGiftCode(code)) {
    return { ok: false, error: "That is not a gift code. Gift codes look like FA-XXXXXXXX.", status: 400 };
  }
  const gift = await getGiftByHash(hashToken(code));
  if (!gift) {
    return { ok: false, error: "Unknown gift code.", status: 404 };
  }
  if (gift.redeemedAt) {
    return { ok: false, error: "This gift code was already used.", status: 409 };
  }
  if (gift.expiresAt <= Date.now()) {
    return { ok: false, error: "This gift code has expired (valid 48 hours).", status: 410 };
  }
  const entitlement = await getEntitlementBySession(gift.stripeSessionId);
  if (!entitlement) {
    return {
      ok: false,
      error: "The purchase behind this gift code is missing. Email billing with the code.",
      status: 409,
    };
  }
  if (entitlement.expiresAt && entitlement.expiresAt <= Date.now()) {
    return { ok: false, error: "The gifted plan has expired.", status: 410 };
  }

  const marked = await markGiftRedeemed(gift.codeHash);
  if (!marked || !marked.redeemedAt) {
    return { ok: false, error: "This gift code was already used.", status: 409 };
  }

  return {
    ok: true,
    token: tokenFromEntitlement(entitlement),
    entitlement,
    expiresAt: gift.expiresAt,
  };
}
