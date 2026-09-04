# Fundalert

Live crypto perpetual **funding-rate radar** plus optional Telegram alerts.

No custody. No auto-trading. No promise of profit. Informational market data only — **not financial advice**.

Free visitors see the top 5 contracts by absolute funding. Weekly / Pro / Lifetime unlocks the full book and alert settings via Stripe Checkout.

## Stack

- Next.js App Router (TypeScript) + Tailwind
- Stripe Checkout Sessions + webhook
- JSON file store locally; [Turso](https://turso.tech) / libSQL on Vercel
- Public REST: Binance USDT-M, Bybit linear, OKX majors (no exchange API keys)

## Local setup

```bash
npm install
cp .env.example .env.local
# fill secrets in .env.local — never commit it
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run build` must pass before deploy.

## Environment variables

See `.env.example`. None of the secret values belong in git.

| Name | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes (to take payment) | Stripe secret / restricted key |
| `STRIPE_WEBHOOK_SECRET` | Yes (to unlock after pay) | Webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Recommended | Publishable key (Checkout is server-redirect; kept for Dashboard parity) |
| `STRIPE_PRICE_WEEKLY` | Yes | `price_1UBzVMBEo0YzuylwICEff8gs` (99 SEK / week) |
| `STRIPE_PRICE_PRO` | Yes | `price_1UBzVMBEo0YzuylwtyurR6vE` (399 SEK / month) |
| `STRIPE_PRICE_LIFETIME` | Yes | `price_1UBzVMBEo0YzuylwxIQuqmoo` (1,990 SEK one-time) |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical origin, e.g. `https://your-app.vercel.app` |
| `ACCESS_TOKEN_SECRET` | Recommended | HMAC secret for access codes (falls back to webhook secret) |
| `TURSO_DATABASE_URL` | Production alerts | libSQL URL. Local JSON file is used if unset |
| `TURSO_AUTH_TOKEN` | With Turso | Turso auth token |
| `TELEGRAM_BOT_TOKEN` | Optional | BotFather token. UI ships without it |
| `CRON_SECRET` | Production cron | Vercel sends `Authorization: Bearer $CRON_SECRET` |

## Deploy on Vercel

1. Push this repo and [import the project](https://vercel.com/new).
2. Framework preset: Next.js. Build command: `npm run build`.
3. Add the env vars above for Production (and Preview if you test payments there).
4. Deploy.
5. Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://YOUR_DOMAIN/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `customer.subscription.deleted`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
6. Stripe Checkout success URL is set in code to `/success?session_id={CHECKOUT_SESSION_ID}`.
7. Cron: `vercel.json` hits `/api/cron/alerts` every 10 minutes. Set `CRON_SECRET` in Vercel (Hobby cron is once/day on some plans; Pro allows 10-minute schedules).

Do **not** enable Stripe Tax in code until you have an active Tax registration for the customer’s jurisdiction. Checkout uses Dashboard payment-method settings (no hardcoded `payment_method_types`).

### Turso (recommended on Vercel)

The JSON file store works on your laptop (`data/store.json`). On Vercel the filesystem is ephemeral, so Telegram subscribers will not persist without a database.

```bash
# https://docs.turso.tech/cli
turso db create fundalert
turso db show fundalert --url
turso db tokens create fundalert
```

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Access codes themselves are HMAC-signed, so the radar still unlocks from the success page cookie even if the DB is down.

## Stripe Checkout

`POST /api/checkout` with `{ "plan": "weekly" | "pro" | "lifetime" }` creates a Checkout Session and returns `{ url }`. The landing CTAs do this and redirect.

Fallback Payment Links can stay in the Stripe Dashboard if Checkout is blocked, but this app implements Checkout Sessions as the in-app path.

## Telegram bot (optional)

Launch does **not** require a bot. If `TELEGRAM_BOT_TOKEN` is missing, `/alerts` still saves a chat id (when the store is available) and the cron job no-ops.

1. In Telegram, talk to [@BotFather](https://t.me/BotFather) → `/newbot`.
2. Copy the token into `TELEGRAM_BOT_TOKEN`.
3. Start a chat with your bot (`/start`).
4. Get your chat id from [@userinfobot](https://t.me/userinfobot) or by calling `getUpdates` on your bot after messaging it.
5. Paid user opens `/alerts`, pastes chat id, sets threshold (default `0.05` meaning 0.05%), saves, optionally sends a test ping.

## Funding-rate sources

Public, unauthenticated REST with 8s timeouts and host fallbacks:

| Venue | Primary | Fallback |
| --- | --- | --- |
| Binance USDT-M | `https://fapi.binance.com/fapi/v1/premiumIndex` | `https://www.binance.com/fapi/v1/premiumIndex` |
| Bybit linear | `https://api.bybit.com/v5/market/tickers?category=linear` | `api.bytick.com`, `api2.bybit.com` |
| OKX (majors) | `/api/v5/public/funding-rate?instId=BTC-USDT-SWAP` (and peers) | — |

Some cloud regions get HTTP 451/403 from exchange CDNs. The API returns whatever sources succeeded and surfaces errors in JSON. `GET /api/rates` is cached ~30s server-side; the UI refreshes every 45s.

`GET /api/rates?public=1` always returns the free top 5. Cookie-authenticated requests return the full book.

## Access model

1. Customer pays in Checkout (email collected by Stripe).
2. Webhook `checkout.session.completed` (and the success page) mint an HMAC access code `fa1.…`.
3. Hash of the code is stored. Raw code is shown once on `/success`.
4. HttpOnly cookie `fa_access` unlocks `/radar` and `/alerts`. `/unlock` pastes the code on another device.

## Routes

| Path | What |
| --- | --- |
| `/` | Landing + public top-5 table + pricing |
| `/radar` | Full or limited radar |
| `/alerts` | Telegram settings (paid) |
| `/unlock` | Paste access code |
| `/success` | Post-Checkout code |
| `/disclaimer` | Legal |
| `GET /api/rates` | Normalized JSON |
| `POST /api/checkout` | Create Checkout Session |
| `POST /api/stripe/webhook` | Unlock access |
| `GET /api/cron/alerts` | Threshold fan-out |

## Disclaimer

Use at your own risk. Funding rates are not yield. Perpetual futures can liquidate you. See `/disclaimer`.
