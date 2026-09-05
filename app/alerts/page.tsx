import Link from "next/link";
import { AlertsForm } from "@/components/alerts-form";
import { getAccessFromCookies, verifyToken } from "@/lib/access";
import { DEFAULT_ALERT_THRESHOLD_PCT } from "@/lib/config";
import { getEntitlementBySession } from "@/lib/store";
import { telegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const access = await getAccessFromCookies();
  if (!access.ok || !access.token) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Telegram alerts</h1>
        <p className="mt-3 text-white/60">
          Private trade-card pings are for paying users. Unlock Trial, Weekly, Pro, or
          Lifetime, then paste your Telegram chat id.
        </p>
        <Link
          href="/#pricing"
          className="mt-6 inline-block rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-black"
        >
          See pricing
        </Link>
      </main>
    );
  }

  const payload = verifyToken(access.token);
  const entitlement = payload ? await getEntitlementBySession(payload.sid) : null;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-lime/80">Paid feature</p>
      <h1 className="mt-2 text-3xl font-semibold">Telegram trade cards</h1>
      <p className="mt-3 text-sm leading-6 text-white/60">
        Message your bot first (so it can reply), then paste the numeric chat id. Cron
        sends the same trade-card format as /signals when |funding| crosses your
        threshold. Watchlist filter still works. This is a ping, not an order.
      </p>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <AlertsForm
          initial={{
            botConfigured: telegramConfigured(),
            telegramChatId: entitlement?.telegramChatId ?? "",
            telegramThresholdPct:
              entitlement?.telegramThresholdPct ?? DEFAULT_ALERT_THRESHOLD_PCT,
            telegramEnabled: entitlement?.telegramEnabled ?? false,
            storePersisted: Boolean(entitlement),
          }}
        />
      </div>
    </main>
  );
}
