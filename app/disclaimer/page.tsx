import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer",
};

export default function DisclaimerPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-amber">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold">Disclaimer</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-white/70">
        <p>
          Fundalert is an informational market-data product. It shows public perpetual
          futures funding rates from third-party exchanges, turns extreme rows into
          trade-card tips (bias, suggested size, invalidation), and can optionally send
          those cards on Telegram when a threshold is crossed.
        </p>
        <p>
          Nothing on this site is financial, investment, tax, or trading advice. Nothing
          here is an offer or solicitation to buy or sell any instrument. Funding rates are
          not a promise of yield. Annualized figures are arithmetic extrapolations, not
          expected returns.
        </p>
        <p>
          Fundalert does not custody crypto or fiat (other than collecting its own software
          fee via Stripe). It does not place orders, run bots, or auto-trade. You are solely
          responsible for any action you take on an exchange.
        </p>
        <p>
          The on-site paper track record is hypothetical and labeled simulated. It marks
          whether a funding-carry thesis still held after 8 hours. It is not live trading
          P&L and ignores mark-price moves, fees, and actual funding prints.
        </p>
        <p>
          Data may be delayed, incomplete, geo-blocked, or wrong. Exchanges change endpoints
          without notice. Past funding is not a guide to future funding. Perpetual futures
          are leveraged products and can cause losses larger than your deposit.
        </p>
        <p>
          Payments are processed by Stripe. Access codes unlock software features only. We
          do not guarantee uptime, alert delivery, or profitability. Use at your own risk.
        </p>
      </div>
    </main>
  );
}
