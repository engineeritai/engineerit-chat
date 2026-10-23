# Launch checklist

Do this once, in order, before the first live charge. Leave `VAT_NUMBER` and `ZATCA_INVOICES_ENABLED` unset. Receipts and invoice PDFs stay a plain total until a VAT number exists.

Chat history (`cursor/chat-history-supabase-163f`, migration `20261016200000_conversations_and_messages.sql`) did not merge into this branch. It conflicted in `app/chat/page.tsx`, `app/components/Sidebar.tsx`, and `vercel.json`. Do not apply that SQL for this launch.

## 1. Supabase SQL

In the Supabase SQL editor, run these files in order. Each file is idempotent.

1. `supabase/migrations/20261016120000_teams_and_enterprise.sql`
2. `supabase/migrations/20261016140000_moyasar_invoices.sql`
3. `supabase/migrations/20261016160000_recurring_billing.sql`
4. `supabase/migrations/20261016180000_advisor_tiers_and_legacy_price.sql`
5. `supabase/migrations/20261016210000_profile_subscription_fields.sql`

Apply `20261016180000` before deploy. If `profiles.consultant_legacy_price_until` is missing, checkout treats the read as “not grandfathered” and existing Consultant subscribers are quoted SAR 99.

Apply `20261016210000` before deploy. Invoice emails and renewal charges read `locale` from `moyasar_invoices` and `billing_subscriptions`.

## 2. Moyasar dashboard

Test mode and live mode are separate. Repeat the steps in each mode you will use.

1. Open the Moyasar dashboard and switch to the mode that matches the keys below.
2. Enable **Tokenization** for the merchant. Without it, the first payment does not return a card token and renewals cannot charge.
3. Copy the secret key (`sk_test_…` or `sk_live_…`) into `MOYASAR_SECRET_KEY`.
4. Copy the publishable key (`pk_test_…` or `pk_live_…`) into `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY`.
5. Add a webhook:
   - URL: `https://<your-domain>/api/payments/moyasar/callback`
   - Event: `payment_paid`
   - Also enable payment-failed events if the dashboard lists them
6. Copy the webhook secret into `MOYASAR_WEBHOOK_SECRET`. The route accepts either the HMAC-SHA256 hex signature of the raw body in `X-Moyasar-Signature`, or a timing-safe `secret_token` equal to that secret. A missing secret, or a body with neither proof, returns 401. The same payment is safe to deliver twice: activation and the invoice email are claimed once.
7. The browser return URL is not the webhook. Moyasar.js returns the customer to `https://<your-domain>/checkout/return?checkout=<id>`. That page confirms the payment, then opens `/payment/success`. A failed confirmation opens `/pricing?payment=failed`.

Test card in test mode: `4201320111111010`, any future expiry, any CVV.

## 3. Vercel environment variables

Set these on the Vercel project (Production, and Preview if you test there). `NEXT_PUBLIC_*` values are exposed to the browser. Redeploy after saving them.

| Name | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key. Server only. |
| `MOYASAR_SECRET_KEY` | Moyasar dashboard → API keys → secret key for the same mode as tokenization |
| `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY` | Moyasar dashboard → API keys → publishable key |
| `MOYASAR_WEBHOOK_SECRET` | The secret you set on the Moyasar webhook in section 2 |
| `CRON_SECRET` | Generate a long random string. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` to `GET /api/cron/renewals` and `GET /api/cron/lifecycle` |
| `LIFECYCLE_EMAILS` | Optional. Set to `on` only after `supabase/migrations/20261023160000_lifecycle_feedback.sql` is applied. Unset or any other value sends nothing. |
| `LIFECYCLE_EMAIL_BATCH` | Optional. Notes per daily run. Default 40, maximum 200. |
| `NEXT_PUBLIC_APP_URL` | The public HTTPS origin, no trailing slash, for example `https://engineerit.ai` |
| `ZSMTP_HOST` | SMTP host from the mail provider |
| `ZSMTP_PORT` | Optional. Defaults to `465` (implicit TLS). Set `587` only if the provider requires STARTTLS |
| `ZSMTP_USER` | SMTP username. This address is also the From address |
| `ZSMTP_PASS` | SMTP password or app password |
| `INVOICE_BCC_EMAIL` | Optional. BCC on every invoice email (first payment and each renewal). Unset uses `support@engineerit.ai` |
| `SALES_TO_EMAIL` | Optional inbox for non-purchase mail |
| `FEEDBACK_TO_EMAIL` | Optional feedback inbox |
| `ADMIN_EMAILS` | Comma-separated emails allowed to open `/admin/subscriptions` |
| `VAT_NUMBER` | Leave unset |
| `ZATCA_INVOICES_ENABLED` | Leave unset |

Cron schedule is already in `vercel.json`: `15 2 * * *` (02:15 UTC) calling `/api/cron/renewals`.

## 4. What the product does after setup

- First payment: `/checkout/<id>` shows the Moyasar card form only after the customer checks the save-card consent box.
- Success: `/payment/success?checkout=<id>` shows the invoice and **Download invoice (PDF)**, then continues to `/chat`. The same PDF is attached to the customer email, with BCC `INVOICE_BCC_EMAIL`.
- Failure: `/pricing?payment=failed` shows an error. `/payment/failed` redirects there.
- Renewals: daily cron retries on day 0, 1, 3, and 7, then moves the account to Assistant Engineer. Each successful renewal emails the customer, BCCs the invoice inbox, and attaches the PDF. The profile lists that invoice for the owner only.
- Profile: current plan, period start, next renewal, billing cycle, auto-renew status, **Renew now** (one-off Moyasar payment that extends the current period), auto-renew toggle (turning it on requires a saved card; otherwise the customer is sent to the SAR 1 card check), **Change plan**, and invoice PDF downloads.
- `/auth/login` → `/login`, `/registration` → `/register`, `/subscription` → `/pricing`, and `/enterprise` → `/pricing` are permanent redirects.

## 5. Routes

Public catalog and account pages:

| Path | Role |
| --- | --- |
| `/` | Home |
| `/pricing` | Canonical plan picker |
| `/register` | Create account |
| `/login` | Sign in |
| `/faq` | FAQ |
| `/advisors`, `/advisors/[slug]` | Advisors |
| `/feedback` | Feedback |
| `/legal/terms`, `/legal/privacy`, `/legal/refund` | Legal |
| `/chat` | Assistant |
| `/profile` | Profile, subscription, invoices |
| `/checkout/[id]`, `/checkout/return` | Moyasar payment and browser return |
| `/payment/success` | Invoice after a verified payment |
| `/payment/failed` | Redirects to `/pricing?payment=failed` |
| `/account/billing`, `/account/billing/card` | Card and cancellation |
| `/account/team` | Team seats |
| `/team/join` | Accept a team invite |
| `/reset-password` | Password reset |
| `/auth/confirmed` | Email confirmed, then `/login` |
| `/admin/subscriptions` | Read-only monitor |
| `/enterprise/paid` | Legacy paid landing |
| `/auth/login` | 301 to `/login` |
| `/registration` | 301 to `/register` |
| `/subscription` | 301 to `/pricing` |
| `/enterprise` | 301 to `/pricing` |
