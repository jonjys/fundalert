import { UnlockForm } from "@/components/unlock-form";
import { getAccessFromCookies } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function UnlockPage() {
  const access = await getAccessFromCookies();
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-lime/80">Access</p>
      <h1 className="mt-2 text-3xl font-semibold">Paste your access code</h1>
      <p className="mt-3 text-sm leading-6 text-white/60">
        After Stripe Checkout you land on a success page with a code. It is also stored in
        a cookie on this browser. Use this page to unlock another device.
      </p>
      {access.ok && (
        <p className="mt-4 rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-lime">
          This browser is already unlocked as {access.plan}
          {access.email ? ` (${access.email})` : ""}.
        </p>
      )}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <UnlockForm />
      </div>
    </main>
  );
}
