-- Couch Cinema Collective — festival v2, slice 6 (FESTIVAL-SPEC.md):
-- the guilt-trip ledger. Every nudge lands here first; the unique key is
-- what guarantees a member is guilted exactly once per film per failing.
-- Written only by the cron route through the service role — RLS is enabled
-- with no policies, so no client can read who was nudged for what.
-- Idempotent. Apply after schema-17.

create table if not exists public.nudge_log (
  festival_id uuid not null references public.festivals (id) on delete cascade,
  -- 0 for festival-level nudges (the final ballot).
  tmdb_id int not null default 0,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('watch', 'review', 'vote', 'missed', 'ballot')),
  sent_at timestamptz not null default now(),
  primary key (festival_id, tmdb_id, user_id, kind)
);

alter table public.nudge_log enable row level security;
