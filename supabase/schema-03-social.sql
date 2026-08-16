-- Couch Cinema Collective — Discord wiring, review upvotes, performer votes.
-- Idempotent: safe to re-run. Apply after schema-02-domain.sql.

-- ---------------------------------------------------------------------------
-- 1. Discord, stored per guild.
--    Server ID and invite are public by design. The webhook is a credential:
--    anyone holding it can post to the channel, so it is never selected into
--    the browser — only the commissioner reads it back, and server actions use
--    it directly.
-- ---------------------------------------------------------------------------
alter table public.guilds
  add column if not exists discord_server_id   text,
  add column if not exists discord_invite_url  text,
  add column if not exists discord_webhook_url text;

-- ---------------------------------------------------------------------------
-- 2. Review upvotes. One per member per review; a member cannot boost their
--    own. The count is derived, never stored, so it can't drift.
-- ---------------------------------------------------------------------------
create table if not exists public.review_votes (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

alter table public.review_votes enable row level security;

create or replace function public.review_guild(rid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select s.guild_id
  from public.reviews r
  join public.seasons s on s.id = r.season_id
  where r.id = rid;
$$;

drop policy if exists "review_votes readable by guild" on public.review_votes;
create policy "review_votes readable by guild"
  on public.review_votes for select to authenticated
  using (public.is_guild_member(public.review_guild(review_id)));

-- Upvoting your own review would make the signal meaningless.
drop policy if exists "review_votes insert own" on public.review_votes;
create policy "review_votes insert own"
  on public.review_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.review_guild(review_id))
    and not exists (
      select 1 from public.reviews r
      where r.id = review_id and r.user_id = (select auth.uid())
    )
  );

drop policy if exists "review_votes delete own" on public.review_votes;
create policy "review_votes delete own"
  on public.review_votes for delete to authenticated
  using (user_id = (select auth.uid()));

create index if not exists review_votes_review_idx
  on public.review_votes (review_id);

-- ---------------------------------------------------------------------------
-- 3. Performer votes.
--    Acting categories are won by a person, not a film, so a ballot row can
--    carry a TMDB person alongside the film. Nullable: every other category
--    leaves it empty and behaves exactly as before.
-- ---------------------------------------------------------------------------
alter table public.votes
  add column if not exists person_id int,
  add column if not exists person    jsonb;
