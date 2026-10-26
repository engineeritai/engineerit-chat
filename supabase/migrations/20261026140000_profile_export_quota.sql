-- Per-user export cap. Do not apply this to production until the owner approves it.
-- Null export_limit means unlimited, so existing accounts stay unlimited.
-- To cap the shared Consultant trial: set export_limit = 3 on that profile.
-- Reset exports_used to 0 to open a new trial window. Nothing here sets a plan-wide limit.

alter table public.profiles
  add column if not exists export_limit integer,
  add column if not exists exports_used integer not null default 0,
  add column if not exists export_window_started_at timestamptz;

comment on column public.profiles.export_limit is
  'Maximum exports in the current window. Null means unlimited.';

comment on column public.profiles.exports_used is
  'Exports already counted in the current window. Reset to 0 to start a new trial window.';

comment on column public.profiles.export_window_started_at is
  'Filled on the first counted export of the window. Cleared only when exports_used is reset.';
