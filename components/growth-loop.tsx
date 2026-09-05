import Link from "next/link";
import { GiftAccess } from "@/components/gift-access";
import { SharePack } from "@/components/share-pack";

export function GrowthLoop({
  origin,
  inviteCode = null,
  unlocked = false,
}: {
  origin: string;
  inviteCode?: string | null;
  unlocked?: boolean;
}) {
  return (
    <section id="share" className="scroll-mt-24 rounded-2xl border border-lime/30 bg-lime/[0.06] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-lime/80">Gift · Invite · Share</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">
        {unlocked ? "Send a seat. Earn extra days." : "Gift access. Invite & earn."}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
        After checkout you get three buttons you cannot miss:{" "}
        <span className="text-white">Use Fundalert now</span>,{" "}
        <span className="text-white">Gift access</span> (48h single-use code), and{" "}
        <span className="text-white">Invite & earn</span> (invitee +3 days, you +7 when they
        pay). Share the Trial even before you buy.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm font-semibold">Gift access</p>
          <p className="mt-1 text-sm leading-6 text-white/60">
            One 48-hour <span className="text-white">FA-XXXXXXXX</span> code. Friend redeems
            on{" "}
            <Link href="/unlock" className="text-lime">
              /unlock
            </Link>
            .
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm font-semibold">Invite & earn</p>
          <p className="mt-1 text-sm leading-6 text-white/60">
            Personal <span className="text-white">/invite/…</span> link. They start Trial 29
            SEK. Extra days land after their payment is claimed.
          </p>
        </div>
      </div>
      {unlocked && (
        <div className="mt-4">
          <GiftAccess />
        </div>
      )}
      <div className="mt-4">
        <SharePack
          origin={origin}
          inviteCode={inviteCode}
          heading={inviteCode ? "Invite snippet" : "Trial snippet"}
        />
      </div>
    </section>
  );
}
