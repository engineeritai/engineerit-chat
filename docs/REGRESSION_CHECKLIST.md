# Regression checklist

Checked against latest `main` (`90e2d22`, Apple Pay / phone QR checkout). Checkout, billing, and invoice source files are left as they are on `main`. This branch does not edit them.

Fonts on the public shell: Inter for Latin and IBM Plex Sans Arabic for Arabic, loaded in `app/layout.tsx`. Shell navigation is 14px, weight 500.

## Pages and routes

| Route | What must stay | Notes |
| --- | --- | --- |
| `/` | Landing page. Sections `#disciplines`, `#tools`, `#how-it-works`, `#teams`, `#faq`. No redirect to `/chat`. | Sidebar + header grid. How it works and the user guide link to their own pages. |
| `/how-it-works` | Walkthrough with the seven-step flow. Stays on this URL. | Linked from the header, sidebar, and home |
| `/guide` | Step-by-step guide: sign up, discipline, ask or upload, tools, advisor playbooks, export, plans and billing | English by default. Arabic from the language toggle |
| `/chat` | Composer, history sidebar, tools in the composer, guest limits | Header does not repeat the sidebar links |
| `/advisors` | Advisor index and playbook names | |
| `/advisors/pmo` | PMO advisor chat | Also `assurance`, `operations`, `decision` |
| `/advisors/assurance` | Program Assurance | |
| `/advisors/operations` | Ops Readiness | |
| `/advisors/decision` | Decision Support | |
| `/pricing` | Plan cards, monthly/annual toggle, Buy buttons, advisor plan table | Prices from `lib/plans.ts` |
| `/register` | Sign-up form and plan catalog | |
| `/login` | Password sign-in | |
| `/profile` | Overview, subscription history, topics and files, plan badge, invoice list | Invoice PDF download still calls `downloadInvoicePdf` |
| `/faq` | Question list | |
| `/feedback` | Feedback form | |
| `/legal/terms` | Terms, including privacy and refund anchors | |
| `/legal/privacy` | Privacy page | |
| `/legal/refund` | Refund page | |
| `/payment/success` | Paid state, invoice download, continue to chat, profile link | Owned by the billing branch; file matches `main` |
| `/payment/failed` | Sends the visitor to `/pricing?payment=failed` | |
| `/reset-password` | Password reset form | |
| `/auth/confirmed` | Email confirmed message, then login | |
| `/account/billing` | Saved card and subscription actions | Billing branch |
| `/account/billing/card` | Card update | Billing branch |
| `/account/team` | Seats and invites | |
| `/team/join` | Invite acceptance | |
| `/enterprise/paid` | Enterprise payment confirmation | |
| `/admin/subscriptions` | Operator subscription list | |
| `/offline` | Offline fallback | |
| `/checkout/[id]` | Moyasar form, Apple Pay when `wallets` is on, phone QR (`PhonePayQr`) on desktop | File matches `main`. Signed-out visitors go to `/login?next=` |
| `/checkout/continue` | Resumes a pending checkout or returns to pricing | |
| `/checkout/return` | Moyasar return handler | |
| `/sitemap.xml` | Public URLs with `en` and `ar` alternates | |
| `/robots.txt` | Sitemap pointer | |
| `/.well-known/apple-developer-merchantid-domain-association` | Apple Pay domain file, `text/plain`, no redirect | |

## Redirects

| From | To | Status |
| --- | --- | --- |
| `/auth/login` | `/login` | 301 |
| `/registration` | `/register` | 301 |
| `/subscription` | `/pricing` | 301 |
| `/enterprise` | `/pricing` | 301 |
| Trailing slash | Same path without slash | 308 via `proxy.ts` |

## Header and sidebar links

Sidebar (left in English, right in Arabic):

- Logo + Home → `/`
- Chat → `/chat`
- Disciplines → `/#disciplines`
- Tools → `/#tools`
- How it works → `/how-it-works` (does not open `/` and then `/chat`)
- User guide → `/guide`

Header (desktop): Home, Tools, Disciplines, How it works, For teams, Questions, User guide. These stay on the page they open. Marketing pages do not run a client redirect to `/chat`.
- For teams → `/#teams`
- AI Advisors → `/advisors`
- Pricing → `/pricing`
- Questions → `/faq`
- Registration and plans → `/register`
- Profile → `/profile`
- Team → `/account/team`
- Feedback → `/feedback`
- User policy → `/legal/terms`
- Language toggle
- Account row → login, or photo / first name / plan badge and the account menu

Header (content column only): menu button on small screens, Chat pill (hidden on `/chat`), account photo or Login.

Footer: plan price list, advisors, pricing, enterprise anchor, FAQ, chat, register, privacy, refunds, terms.

## Checkout and invoices (not modified here)

- `lib/moyasarEnv.ts` enables `applepay`, `samsungpay` when configured, `stcpay`, and `creditcard`.
- Checkout passes `wallets` into `MoyasarCardForm` and renders `PhonePayQr` when the desktop page has a phone-pay URL.
- `GET /api/invoices` requires a session (401 when signed out).
- `GET /api/invoices/[id]/pdf` is still the invoice PDF route (not removed).

## Results

Playwright smoke (`npx playwright test tests/e2e/routes.smoke.spec.ts`): 10 passed, 2 skipped (the redirect check runs once, on desktop). Viewports: 1440, 768, and 390. Languages: English and Arabic.

`/`, `/how-it-works`, `/guide`, `/pricing`, `/faq`, `/advisors`, `/register`, and `/feedback` were still on the same path after 3 seconds. Clicking How it works on the home page opened `/how-it-works` and stayed there. The guide link opened `/guide` and stayed there. Steps 1 and 7 were on the guide.

Screenshots are under `/opt/cursor/artifacts/regression/` named `{desktop-1440|tablet-768|phone-390}-{en|ar}-{route}.png`.
