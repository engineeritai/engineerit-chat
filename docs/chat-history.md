# Chat history

Conversations used to live only in the browser, so they disappeared after logout or a reload. Signed-in chats are now stored in Supabase and loaded into the history sidebar on any device.

Guests still get one temporary chat in the page. It is not written to the database.

## One-time setup

1. Apply the billing migrations first. They create `public.teams` and `public.team_members`:

   - `supabase/migrations/20261016120000_teams_and_enterprise.sql`
   - `supabase/migrations/20261016140000_moyasar_invoices.sql`
   - `supabase/migrations/20261016160000_recurring_billing.sql`
   - `supabase/migrations/20261016180000_advisor_tiers_and_legacy_price.sql`
   - `supabase/migrations/20261016210000_profile_subscription_fields.sql` (invoice language only; it does not touch chat history)

   Then run:

   `supabase/migrations/20261016200000_conversations_and_messages.sql`

   The history script is safe to re-run. It expects `public.profiles` to already exist, with `profiles.id` equal to `auth.users.id` and a `subscription_tier` column. It does not create `teams` or `team_members` and does not replace their policies. `conversations.team_id` is a foreign key only when `public.teams` already exists (`to_regclass('public.teams')`). Sharing queries `team_members` and `teams.owner_id` only when those tables exist. A new `public` table in any migration also needs row level security and explicit grants in that same file. See `supabase/migrations/README.md`.

2. In the Vercel project, set `CRON_SECRET` to a long random value. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>` to `GET /api/cron/history-cleanup` every day at 03:00 UTC (`vercel.json`). The route rejects the call when the secret is missing or wrong.

3. Redeploy so the cron entry is registered. You can also call the route by hand:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/history-cleanup
   ```

4. The existing `/api/cleanup` job also deletes expired conversations. Keep using it if something already calls it. The protected cron is the one that should run daily.

5. Team sharing uses the team created by billing. A Team or Enterprise user can share after they own that team (`teams.owner_id`) or have an active `team_members` row (`user_id` set and `status = 'active'`). Checkout creates those rows. Do not insert a second teams table from this migration.

6. `vercel.json` schedules both `GET /api/cron/renewals` (02:15 UTC) and `GET /api/cron/history-cleanup` (03:00 UTC). Keep both entries.

## Tables

`conversations` stores the chat: owner (`user_id`), title, discipline, pin, team share flag, `team_id`, timestamps, and `expires_at`.

`messages` stores each turn: `role` (`user` or `assistant`), text, and `attachments` JSON. Attachment metadata is the file name, kind (`image` or `file`), mime type, and size. File bytes and data URLs are not stored. After a reload the sidebar can show the file name, not the original preview.

Deleting a conversation deletes its messages (`ON DELETE CASCADE`).

## Access control

Row level security is enabled:

- A user can read, create, update, and delete only their own conversations.
- A user can read a teammate's conversation only when `shared_with_team` is true and `team_id` is a team they own (`teams.owner_id`) or belong to as an active member.
- Only the owner can insert messages.
- Sharing is allowed only when `profiles.subscription_tier` is `team` or `enterprise` and the team id is theirs.
- `purge_expired_conversations()` is executable by `service_role` only.

The app APIs use the service role and repeat these checks. They trust the Supabase access token (`Authorization: Bearer`), not a user id in the body.

## Retention

Retention is based on `profiles.subscription_tier` and the conversation `created_at`. It is applied when a chat is saved and again by the daily cleanup. Upgrading lengthens existing chats the next time they are saved or when the cron runs. Downgrading shortens them the same way.

| Plan | `subscription_tier` | Kept |
| --- | --- | --- |
| Assistant Engineer (free) | `assistant`, `free`, or unknown | 3 days |
| Engineer | `engineer` | 30 days |
| Professional Engineer | `professional` or `pro` | 90 days |
| Consultant Engineer | `consultant`. Pilot and trial aliases follow Consultant. | 1 year |
| Team and Enterprise | `team`, `enterprise` | Unlimited (`expires_at` is null) |

The sidebar shows a short note, with a link to `/pricing`, when a chat is inside the last day (free), 3 days (Engineer), 7 days (Professional), or 14 days (Consultant) of its window.

## Sidebar actions

Search, rename, pin, and delete are available on every signed-in plan. Search matches the title and message text.

Export of a whole chat to PDF or Word is available from Professional Engineer upward, including Consultant, Team, and Enterprise. The PDF embeds Noto Sans Arabic (SIL Open Font License, see `assets/fonts/OFL.txt`) so Arabic text can be drawn. Word keeps the original Unicode and lets the editor shape it.

Team and Enterprise members can share a chat with their team. Teammates can read and export it. They cannot rename, pin, delete, or reply.
