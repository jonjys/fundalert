# Fundalert

Live crypto perpetual **funding-rate radar** plus optional Telegram alerts.

No custody. No auto-trading. No promise of profit. Informational market data only — **not financial advice**.

Free visitors see the top 5 contracts by absolute funding. Trial (29 SEK / 3 days), Weekly, Pro, or Lifetime unlocks the full book and alert settings via Stripe Payment Links (or Checkout Sessions when secrets are set).

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
| `STRIPE_SECRET_KEY` | **Required to unlock Payment Link buyers** | Stripe secret. Without it, `/?paid=…&session_id=…` cannot verify the session. |
| `STRIPE_WEBHOOK_SECRET` | Recommended (background grants) | Webhook signing secret; also a fallback HMAC secret |
| `ACCESS_TOKEN_SECRET` | **Required to sign access** | HMAC secret for cookies / gift redemption (falls back to webhook secret) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Recommended | Publishable key (Checkout is server-redirect; kept for Dashboard parity) |
| `STRIPE_PRICE_TRIAL` | Recommended | `price_1UC3gNBEo0YzuylwRWwf8403` (29 SEK / 3 days, one-time) |
| `STRIPE_PRICE_WEEKLY` | Yes | `price_1UBzVMBEo0YzuylwICEff8gs` (99 SEK / week) |
| `STRIPE_PRICE_PRO` | Yes | `price_1UBzVMBEo0YzuylwtyurR6vE` (399 SEK / month) |
| `STRIPE_PRICE_LIFETIME` | Yes | `price_1UBzVMBEo0YzuylwxIQuqmoo` (1,990 SEK one-time) |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical origin, e.g. `https://your-app.vercel.app` |
| `TURSO_DATABASE_URL` | Production alerts + gifts/invites | libSQL URL. Local JSON file is used if unset |
| `TURSO_AUTH_TOKEN` | With Turso | Turso auth token |
| `TELEGRAM_BOT_TOKEN` | Optional | BotFather token. Point the webhook at `/api/telegram` |
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
6. Stripe Checkout success URL (in-app Sessions) is `/success?session_id={CHECKOUT_SESSION_ID}&paid={plan}`.
7. **Payment Links must redirect to** `https://YOUR_DOMAIN/?paid=trial&session_id={CHECKOUT_SESSION_ID}` (or `weekly` / `pro`). `{CHECKOUT_SESSION_ID}` is required — `?paid=trial` alone cannot unlock.
8. Cron: `vercel.json` hits `/api/cron/alerts` daily on Hobby. Set `CRON_SECRET` in Vercel.

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

Landing CTAs use live Stripe Payment Links (no `STRIPE_SECRET_KEY` required):

- Trial: `https://buy.stripe.com/7sYdR851T8J0eSYanb8og0p` (29 SEK / 3 days)
- Weekly: `https://buy.stripe.com/9B6eVc2TLaR85io9j78og0n` (99 SEK / week)
- Pro: `https://buy.stripe.com/dRm5kC9i9aR8fX22UJ8og0o` (399 SEK / month)

Set each Payment Link’s after-completion URL to:

`https://YOUR_DOMAIN/?paid=trial&session_id={CHECKOUT_SESSION_ID}`

(or `weekly` / `pro`). Production example: `https://fundalert-xi.vercel.app/?paid=trial&session_id={CHECKOUT_SESSION_ID}`.

The site then **claims** the session (`POST /api/access/claim`) and offers three actions — it does **not** pretend the radar is unlocked until the buyer chooses **Use Fundalert now**:

1. **Use Fundalert now** — sets the `fa_access` cookie and sends them to `/radar`.
2. **Gift access** — one 48-hour, single-use `FA-XXXXXXXX` code (previous unused codes for that session are invalidated). Redeem on `/unlock`.
3. **Invite & earn** — personal `/invite/ABC123` link. Invitee gets +3 days when they pay; inviter gets +7 days when that payment is claimed.

`POST /api/checkout` with `{ "plan": "trial" | "weekly" | "pro" | "lifetime" }` still creates a Checkout Session when Stripe secrets are configured. If a `fa_ref` cookie is present, it is copied to Stripe `metadata.referral`.

Owner smoke-test (do not treat this as the only path): a live Trial session id looks like `cs_live_…`. Opening `/?paid=trial&session_id=<that id>` with `STRIPE_SECRET_KEY` + `ACCESS_TOKEN_SECRET` set should show the three buttons.

## Telegram bot (optional)

Launch does **not** require a bot. If `TELEGRAM_BOT_TOKEN` is missing, `/alerts` still saves a chat id (when the store is available) and the cron job no-ops.

1. In Telegram, talk to [@BotFather](https://t.me/BotFather) → `/newbot`.
2. Copy the token into `TELEGRAM_BOT_TOKEN`.
3. Point the webhook at production:

```bash
curl -sS "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://fundalert-xi.vercel.app/api/telegram"
```

4. Start a chat with your bot. Commands: `/start`, `/alerts` (prints chat id + `/alerts` URL), `/id`.
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

1. Customer pays (Payment Link or Checkout). Stripe collects email.
2. Return URL includes `session_id`. The client calls `POST /api/access/claim`, which verifies the session is paid via the Stripe API and upserts an entitlement (`grantFromCheckoutSession`). The webhook does the same in the background.
3. Post-checkout UI (not a raw long-lived code):
   - **Use Fundalert now** → `POST /api/access/activate` sets httpOnly `fa_access` and redirects to `/radar`.
   - **Gift access** → `POST /api/access/gift` returns a 48h single-use `FA-…` code once. `/unlock` calls `POST /api/access/redeem`.
   - **Invite & earn** → `/invite/{code}` sets `fa_ref` and appends `client_reference_id` on the Trial Payment Link.
4. If Stripe secrets are missing, the UI says so and asks them to email billing with the session id. It never claims they already have access.

### Referral rewards — shipped vs stubbed

**Shipped now**

- Invite links on the current host (`/invite/ABC123`).
- `fa_ref` cookie + Payment Link `?client_reference_id=`.
- In-app Checkout copies `metadata.referral` from that cookie.
- On claim/webhook: invitee +3 days, inviter +7 days (lifetime stays unlimited). Stored on the entitlement (`referralCode`, `referredBy`, `referralRewardsGranted`).

**Stubbed / TODO**

- Stripe Customer coupon / credit / balance for the inviter.
- Payment Link Dashboard `metadata.referral` (Links cannot be parameterized beyond `client_reference_id` / prefilled email).
- `fundalert.app` vanity host (use the current origin until DNS is ready).

## Routes

| Path | What |
| --- | --- |
| `/` | Landing + public top-5 table + pricing |
| `/radar` | Full or limited radar |
| `/alerts` | Telegram settings (paid) |
| `/unlock` | Redeem a gift code |
| `/success` | Same post-checkout actions as `/?paid=&session_id=` |
| `/invite/[code]` | Referral landing |
| `/disclaimer` | Legal |
| `GET /api/rates` | Normalized JSON |
| `POST /api/checkout` | Create Checkout Session |
| `POST /api/access/claim` | Verify paid session (no cookie) |
| `POST /api/access/activate` | Set access cookie |
| `POST /api/access/gift` | Mint 48h single-use gift code |
| `POST /api/access/redeem` | Redeem gift code |
| `POST /api/stripe/webhook` | Background grant |
| `POST /api/telegram` | Bot webhook (`/start` `/alerts` `/id`) |
| `GET /api/cron/alerts` | Threshold fan-out |

## Disclaimer

Use at your own risk. Funding rates are not yield. Perpetual futures can liquidate you. See `/disclaimer`.
