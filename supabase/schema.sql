-- ============================================================
-- ESB Case — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL > New query)
--
-- NOTE: Table creation + security only. The 6 built-in SOP cases are
--       seeded automatically by the app (seed.js) on first load, so you
--       do NOT need to insert them manually here.
-- ============================================================

-- 1) Create the cases table
create table if not exists public.cases (
  id            text primary key,
  title         text not null,
  category      text not null,
  severity      text not null default 'medium',
  tags          jsonb not null default '[]'::jsonb,
  summary       text not null default '',
  problem_context text not null default '',
  action_steps  jsonb not null default '[]'::jsonb,
  dos_and_donts jsonb not null default '{"dos":[],"donts":[]}'::jsonb,
  snippets      jsonb not null default '[]'::jsonb,
  is_custom     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2) Enable Row Level Security
alter table public.cases enable row level security;

-- 2b) Auto-update updated_at on any change
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cases_updated_at on public.cases;
create trigger trg_cases_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- 3) Policies: anonymous read + write for a shared internal KB
--    (Adjust to authenticated-only if you add auth later.)
drop policy if exists "public read cases" on public.cases;
create policy "public read cases"
  on public.cases for select
  using (true);

drop policy if exists "public insert cases" on public.cases;
create policy "public insert cases"
  on public.cases for insert
  with check (true);

drop policy if exists "public update cases" on public.cases;
create policy "public update cases"
  on public.cases for update
  using (true);

drop policy if exists "public delete cases" on public.cases;
create policy "public delete cases"
  on public.cases for delete
  using (true);

-- ============================================================
-- Done. After running, the app will auto-seed the 6 built-in cases
-- on first load. Verify with:
--   select id, title from public.cases order by created_at;
-- ============================================================
