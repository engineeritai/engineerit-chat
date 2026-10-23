# Billing

Team, Enterprise, and the individual paid plans are bought and renewed in the product through Moyasar. No invoice, bank transfer, or owner step is part of a purchase.

Published prices (annual = 10× monthly):

| Plan | Monthly | Annual | Seats |
| --- | --- | --- | --- |
| Engineer | SAR 19 | SAR 190 | 1 |
| Professional Engineer | SAR 41 | SAR 410 | 1 |
| Consultant Engineer | SAR 99 | SAR 990 | 1. PMO Advisor |
| Team | SAR 449 | SAR 4,490 | 5 included, extra seat SAR 89 / month (SAR 890 / year). PMO and Program Assurance |
| Enterprise | SAR 3,900 | SAR 39,000 | 10 included, extra seat SAR 299 / month (SAR 2,990 / year). PMO, Program Assurance, Operations Readiness, and Decision Support |

Engineer and Professional Engineer have no advisors. Advisor access is an allow-list per advisor, checked on the server from the signed-in profile. A locked advisor shows a short preview and a Moyasar checkout button for the lowest plan that includes it: PMO on Consultant Engineer, Program Assurance on Team, Operations Readiness and Decision Support on Enterprise.

Existing Consultant subscribers keep SAR 79 / month (SAR 790 / year) while `profiles.consultant_legacy_price_until` is in the future. The migration sets that timestamp to three months from when it is applied. After the timestamp, checkout and renewal use SAR 99 / SAR 990. New Consultant buyers pay the list price. A pilot or trial uses `profiles.advisor_trial_plan` (`consultant`, `team`, or `enterprise`) for advisor access. Apply the migration before deploy so renewals keep the grandfathered price.

The first payment uses the Moyasar payment form with **Save card** after the customer checks the consent box. Moyasar returns a card token. A Vercel Cron job charges that token on the renewal date.

## One-time owner setup

1. Apply the SQL files below in Supabase, in filename order.
2. Set the environment variables in Vercel (and locally). `NEXT_PUBLIC_*` values are exposed to the browser.
3. In the Moyasar dashboard, enable **Tokenization** for the merchant. Test mode and live mode are separate.
4. In Moyasar, add a webhook for `payment_paid` (and payment failed events if offered) to `https://<your-domain>/api/payments/moyasar/callback`. Set the webhook secret to the same value as `MOYASAR_WEBHOOK_SECRET`.
5. Set `CRON_SECRET`. Vercel Cron calls `GET /api/cron/renewals` daily at 02:15 UTC (`vercel.json`) and sends `Authorization: Bearer <CRON_SECRET>`.
6. Leave `VAT_NUMBER` and `ZATCA_INVOICES_ENABLED` unset. The business is VAT-exempt until a VAT number exists, so receipts stay a plain total.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser auth |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server writes (bypasses RLS). Never expose to the browser. |
| `MOYASAR_SECRET_KEY` | yes | `sk_test_…` or `sk_live_…`. Charges saved tokens and verifies payments. |
| `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY` | yes | `pk_test_…` or `pk_live_…`. Loads the card form. |
| `MOYASAR_WEBHOOK_SECRET` | yes | Webhook HMAC secret, or the `secret_token` Moyasar posts. Missing secret rejects every webhook. |
| `CRON_SECRET` | yes | Authorizes `/api/cron/renewals`. Missing secret rejects the job. |
| `NEXT_PUBLIC_APP_URL` | yes | Public HTTPS origin, no trailing slash. Used for Moyasar return URLs, the renewal callback, and the update-card link in failure emails. |
| `ZSMTP_HOST` | yes for email | SMTP host for receipts and billing notes |
| `ZSMTP_PORT` | no | Default `465` |
| `ZSMTP_USER` | yes for email | SMTP user and From address |
| `ZSMTP_PASS` | yes for email | SMTP password |
| `SALES_TO_EMAIL` | no | Inbox for non-purchase mail |
| `FEEDBACK_TO_EMAIL` | no | Feedback inbox |
| `ADMIN_EMAILS` | yes for the monitor | Comma-separated emails allowed to open `/admin/subscriptions` |
| `VAT_NUMBER` | no | Leave unset while the business is VAT-exempt. When set, receipts show a VAT-inclusive net and 15% breakdown plus this number. | 
| `ZATCA_INVOICES_ENABLED` | no | `true` or `1`, and only together with `VAT_NUMBER`, titles the receipt as a tax invoice. This does not generate ZATCA XML. Unset receipts do not use the words “tax invoice”. |
| `INVOICE_BCC_EMAIL` | no | BCC on every invoice email (first payment and renewals). Defaults to `support@engineerit.ai` when unset. |

## Supabase migrations

Run once, in order. Each file is idempotent (`if not exists` / `add column if not exists`).

1. `supabase/migrations/20261016120000_teams_and_enterprise.sql` — `teams`, `team_members`, RLS.
2. `supabase/migrations/20261016140000_moyasar_invoices.sql` — checkout rows used by the first payment.
3. `supabase/migrations/20261016160000_recurring_billing.sql` — `saved_cards`, `billing_subscriptions`, `renewal_attempts`, plus `payment_id` on checkout rows.
4. `supabase/migrations/20261016180000_advisor_tiers_and_legacy_price.sql` — `consultant_legacy_price_until` and `advisor_trial_plan` on `profiles`, and a three-month grandfather backfill for current Consultant rows. Apply this before the new prices go live.
5. `supabase/migrations/20261016210000_profile_subscription_fields.sql` — `locale` on checkout rows and billing subscriptions, so invoice emails and PDFs stay in the buyer’s language. Apply this before deploy.
6. `supabase/migrations/20261023160000_promo_codes.sql` — promo codes, redemptions, and the weekly question. Apply this before creating codes. It grants the tables to `service_role` only and enables RLS with no client policies, so a signed-in user cannot read the code list or the question answers.

`saved_cards`, `billing_subscriptions`, and `renewal_attempts` have RLS enabled and no client policies. Only the service role reads or writes them. Card tokens are never returned to the browser.

## How renewal works

- Attempts run on day 0, 1, 3, and 7 after `current_period_end`.
- Success extends the period (30 or 365 days), resets the failure count, and emails a receipt.
- A failed charge emails the customer with a link to `/account/billing`. Access stays on through the day-7 retry. Team access is held by extending the team period to the end of that grace window.
- After the day-7 attempt fails, the account moves to Assistant Engineer and a team is marked lapsed.
- Cancel in the billing page sets `cancel_at_period_end`. The cron expires the plan at period end and does not charge. Resume is available before that date.
- Seat increases charge a prorated amount on the saved card (minimum SAR 1). Seat decreases store credit against the next renewal. There is no cash refund.
- Each charge uses a stable idempotency key (`renewal:<id>:<period end>:<attempt>` or `seats:<id>:<period end>:<from>-><to>`) both in `renewal_attempts` and as Moyasar’s `Idempotency-Key`.
- A payment that is still `initiated` stays pending and is fetched again. It is not counted as a failed retry, so a later success cannot be charged a second time.

## Card update

`/account/billing/card` runs a SAR 1 verification payment with Save card, with the signed-in user id in metadata. The saved token replaces the previous card only when that payment is paid, the amount is 100 halalas, and the metadata matches the session.

## Moyasar test card

In test mode: `4201320111111010`, any future expiry, any CVV. Tokenization must be enabled or Moyasar will not return a token.

## Promo codes

List prices do not change. A code discounts the amount stored on the checkout, and Moyasar is charged that discounted amount. The code is saved on the invoice. After the discounted cycles end, renewal uses the list price again. A free checkout (100% off or free months, charged SAR 0) skips Moyasar and activates the period directly.

`/admin/codes` is limited to `ADMIN_EMAILS`. From there the owner can:

1. Create one code (percent, fixed SAR, or free months; plans; cycles; dates; max uses; one use per user; audience).
2. Generate a student batch of single-use codes, optionally limited to email domains such as `.edu.sa`.
3. Create a win-back code with audience “Lapsed subscribers”. It applies only when the account has paid before and has no active or past-due subscription.
4. Publish the question of the week (English and Arabic, choices, correct index, reward percent, and whether taking part is enough). The public page is `/question`.
5. Disable a code and read redemptions.

A question reward is a single-use code restricted to that user. Share buttons on `/question` share the page, not the code.

## Admin

`/admin/subscriptions` lists subscriptions, charge attempts, and teams for `ADMIN_EMAILS`. It does not activate plans or create invoices. `/admin/codes` creates promo codes.
