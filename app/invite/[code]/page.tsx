import Link from "next/link";
import { InviteLanding } from "@/components/invite-landing";
import { PAYMENT_LINKS } from "@/lib/config";
import { isReferralCode } from "@/lib/codes";
import { getEntitlementByReferralCode } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = raw.trim().toUpperCase();
  const valid = isReferralCode(code);
  let known = false;
  if (valid) {
    try {
      known = Boolean(await getEntitlementByReferralCode(code));
    } catch {
      known = false;
    }
  }

  const trialHref = PAYMENT_LINKS.trial
    ? `${PAYMENT_LINKS.trial}?client_reference_id=${encodeURIComponent(code)}`
    : "/#pricing";

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-lime/80">Invite & earn</p>
      <h1 className="mt-2 text-3xl font-semibold">You were invited to Fundalert</h1>
      <p className="mt-3 text-sm leading-6 text-white/60">
        Funding-rate radar. Tips only — not financial advice. No custody, no auto-trade.
        Start a 29 SEK / 3-day trial and we add <span className="text-white">+3 days</span>{" "}
        when you pay. Your inviter gets <span className="text-white">+7 days</span> after
        that payment.
      </p>
      {!valid ? (
        <p className="mt-6 text-sm text-rose">This invite code is not valid.</p>
      ) : (
        <InviteLanding code={code} known={known} trialHref={trialHref} />
      )}
      <p className="mt-8 text-sm text-white/50">
        Already paid?{" "}
        <Link href="/unlock" className="text-lime">
          Redeem a gift code
        </Link>
        .
      </p>
    </main>
  );
}
