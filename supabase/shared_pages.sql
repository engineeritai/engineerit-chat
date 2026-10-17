create table if not exists public.shared_pages (
  id text primary key,
  title text not null,
  markdown text not null,
  locale text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.shared_pages enable row level security;
