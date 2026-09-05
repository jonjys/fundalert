const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const CHECKOUT_SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]+$/;
export const GIFT_CODE_RE = /^FA-[A-Z2-9]{8}$/;
export const REFERRAL_CODE_RE = /^[A-Z2-9]{8}$/;

export function isCheckoutSessionId(value: string): boolean {
  return CHECKOUT_SESSION_ID_RE.test(value);
}

export function normalizeGiftCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isGiftCode(value: string): boolean {
  return GIFT_CODE_RE.test(normalizeGiftCode(value));
}

export function isReferralCode(value: string): boolean {
  return REFERRAL_CODE_RE.test(value.trim().toUpperCase());
}

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

export function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

export function newGiftCode(): string {
  return `FA-${randomCode(8)}`;
}

export function newReferralCode(): string {
  return randomCode(8);
}
