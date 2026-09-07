-- Couch Cinema Collective — festival v2, part 1 (FESTIVAL-SPEC.md):
-- producer's pitch, first-come film claiming, dual upvote types with
-- stacking. Additive where the live app still calls the old shapes:
-- film_reviews() and my_upvote_budget() remain; the v2 client uses
-- film_reviews_v2() and my_upvote_budgets(). Idempotent: safe to re-run.
-- Apply after schema-12-moderation.sql.

-- ---------------------------------------------------------------------------
-- 1. The Producer's Pitch: up to 200 characters on a nomination, shown
--    anonymously on the film's card. Optional — silence is allowed.
-- ---------------------------------------------------------------------------
alter table public.nominations
  add column if not exists pitch text not null default '';
alter table public.nominations drop constraint if exists nominations_pitch_check;
alter table public.nominations add constraint nominations_pitch_check
  check (char_length(pitch) <= 200);

-- First to nominate a title claims it — no duplicates within a festival.
-- Enforced by trigger rather than a unique index: legacy festivals already
-- hold duplicate picks, and history is not ours to rewrite. New nominations
-- are policed; old rows stand.
drop index if exists public.nominations_one_film_per_festival;

create or replace function public.enforce_film_claim()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.nominations n
    where n.festival_id = new.festival_id
      and n.tmdb_id = new.tmdb_id
      and n.user_id <> new.user_id
  ) then
    raise exception 'This film is already claimed for this festival';
  end if;
  return new;
end;
$$;

drop trigger if exists film_claim_check on public.nominations;
create trigger film_claim_check
  before insert or update of tmdb_id on public.nominations
  for each row execute procedure public.enforce_film_claim();

-- Nomination rows carry user_id, so the pitch surfaces through a definer
-- function rather than a select policy — anonymity holds until the ceremony.
create or replace function public.film_pitch(fid uuid, tid int)
returns text
language sql stable security definer set search_path = ''
as $$
  select n.pitch
  from public.nominations n
  where n.festival_id = fid
    and n.tmdb_id = tid
    and public.is_guild_member(public.festival_guild(fid))
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Dual upvote types. "Most Insightful" and "Funniest", three votes of
--    each per critic per film, stacking on one review allowed. The old
--    one-vote-per-review primary key becomes a surrogate id.
-- ---------------------------------------------------------------------------
alter table public.review_votes
  add column if not exists kind text not null default 'insightful';
alter table public.review_votes drop constraint if exists review_votes_kind_check;
alter table public.review_votes add constraint review_votes_kind_check
  check (kind in ('insightful', 'funniest'));

alter table public.review_votes
  add column if not exists id uuid not null default gen_random_uuid();

do $$
begin
  -- Swap the composite primary key for the surrogate one exactly once.
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'review_votes'
      and constraint_name = 'review_votes_pkey'
      and constraint_type = 'PRIMARY KEY'
  ) and (
    select count(*) from information_schema.key_column_usage
    where table_schema = 'public' and table_name = 'review_votes'
      and constraint_name = 'review_votes_pkey'
  ) > 1 then
    alter table public.review_votes drop constraint review_votes_pkey;
    alter table public.review_votes add primary key (id);
  end if;
end $$;

create index if not exists review_votes_allocation_idx
  on public.review_votes (user_id, review_id, kind);

-- Budget: three per KIND per film (was: three total). The old client keeps
-- working during the overlap — it just sees the insightful budget.
create or replace function public.enforce_upvote_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare r record; spent int;
begin
  select festival_id, tmdb_id, eligible, user_id into r
  from public.reviews where id = new.review_id;

  if public.screening_phase(r.festival_id, r.tmdb_id) <> 'CRITICS_VOTING' then
    raise exception 'The voting window for this film is not open';
  end if;

  if not r.eligible then
    raise exception 'That review was filed late and cannot be voted on';
  end if;

  if r.user_id = new.user_id then
    raise exception 'You cannot upvote your own review';
  end if;

  select count(*) into spent
  from public.review_votes v
  join public.reviews rr on rr.id = v.review_id
  where v.user_id = new.user_id
    and v.kind = new.kind
    and rr.festival_id = r.festival_id
    and rr.tmdb_id = r.tmdb_id;

  if spent >= 3 then
    raise exception 'You have already spent all three % upvotes on this film',
      new.kind;
  end if;

  return new;
end;
$$;

-- Per-kind budgets for the v2 client. One row per kind, always both rows.
create or replace function public.my_upvote_budgets(fid uuid, tid int)
returns table (kind text, spent int, remaining int)
language sql stable security definer set search_path = ''
as $$
  select k.kind,
         count(v.id)::int,
         greatest(0, 3 - count(v.id))::int
  from (values ('insightful'), ('funniest')) as k (kind)
  left join public.review_votes v
    on v.kind = k.kind
   and v.user_id = (select auth.uid())
   and v.review_id in (
     select r.id from public.reviews r
     where r.festival_id = fid and r.tmdb_id = tid
   )
  group by k.kind;
$$;

-- The review thread with per-kind counts. Public counts stay hidden until
-- the film closes; your own allocation is always visible so the buttons can
-- show where your votes sit.
drop function if exists public.film_reviews_v2(uuid, int);
create function public.film_reviews_v2(fid uuid, tid int)
returns table (
  id uuid,
  user_id uuid,
  body text,
  eligible boolean,
  created_at timestamptz,
  insightful bigint,
  funniest bigint,
  my_insightful int,
  my_funniest int,
  mine boolean,
  revealed boolean
)
language sql stable security definer set search_path = ''
as $$
  select r.id,
         case when public.screening_phase(fid, tid) = 'CLOSED'
              then r.user_id else null end,
         r.body,
         r.eligible,
         r.created_at,
         case when public.screening_phase(fid, tid) = 'CLOSED'
              then (select count(*) from public.review_votes v
                    where v.review_id = r.id and v.kind = 'insightful')
              else 0::bigint end,
         case when public.screening_phase(fid, tid) = 'CLOSED'
              then (select count(*) from public.review_votes v
                    where v.review_id = r.id and v.kind = 'funniest')
              else 0::bigint end,
         (select count(*)::int from public.review_votes v
          where v.review_id = r.id and v.kind = 'insightful'
            and v.user_id = (select auth.uid())),
         (select count(*)::int from public.review_votes v
          where v.review_id = r.id and v.kind = 'funniest'
            and v.user_id = (select auth.uid())),
         r.user_id = (select auth.uid()),
         public.screening_phase(fid, tid) = 'CLOSED'
  from public.reviews r
  where r.festival_id = fid
    and r.tmdb_id = tid
    and public.is_guild_member(public.festival_guild(fid))
    and public.screening_phase(fid, tid) in ('CRITICS_VOTING', 'CLOSED')
  order by r.created_at;
$$;
