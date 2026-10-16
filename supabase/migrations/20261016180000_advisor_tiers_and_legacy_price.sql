-- Per-advisor trials and the Consultant price grandfather.
-- Safe to run again.

alter table public.profiles
  add column if not exists consultant_legacy_price_until timestamptz;

alter table public.profiles
  add column if not exists advisor_trial_plan text;

comment on column public.profiles.consultant_legacy_price_until is
  'While this timestamp is in the future, Consultant checkout and renewal use SAR 79 / month (SAR 790 / year).';

comment on column public.profiles.advisor_trial_plan is
  'When subscription_tier is pilot or trial, advisor access follows this plan: consultant, team, or enterprise.';

-- Existing Consultant subscribers keep SAR 79 for 3 months from this migration.
update public.profiles
set consultant_legacy_price_until = now() + interval '3 months'
where subscription_tier::text = 'consultant'
  and consultant_legacy_price_until is null;
