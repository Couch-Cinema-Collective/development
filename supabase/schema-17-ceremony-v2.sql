-- Couch Cinema Collective — festival v2, slice 5 (FESTIVAL-SPEC.md):
-- the final ballot gains Best Review; results allow ties; Best Critic is
-- scored (leaderboard points + Best Review votes) with the missed-film
-- penalty enforced; the president schedules the reveal and the guild
-- watches a countdown. Idempotent. Apply after schema-16.

set check_function_bodies = off;

-- ── 1. Best Review votes point at a review, not just a film ────────────────
alter table public.votes
  add column if not exists review_id uuid references public.reviews (id) on delete set null;

-- ── 2. The two clocks: ballots close after three days; the ceremony airs
--      when the president says so.
alter table public.festivals
  add column if not exists awards_close_at timestamptz,
  add column if not exists ceremony_at     timestamptz;

-- ── 3. Results that can hold a tie, and a person as a winner ───────────────
alter table public.award_results
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists winner_id uuid references auth.users (id) on delete set null;
alter table public.award_results alter column tmdb_id drop not null;

do $$
begin
  if (select count(*) from information_schema.key_column_usage
      where table_schema = 'public' and table_name = 'award_results'
        and constraint_name = (
          select constraint_name from information_schema.table_constraints
          where table_schema = 'public' and table_name = 'award_results'
            and constraint_type = 'PRIMARY KEY')) > 1 then
    execute (
      select format('alter table public.award_results drop constraint %I',
                    constraint_name)
      from information_schema.table_constraints
      where table_schema = 'public' and table_name = 'award_results'
        and constraint_type = 'PRIMARY KEY');
    alter table public.award_results add primary key (id);
  end if;
end $$;

create index if not exists award_results_festival_idx
  on public.award_results (festival_id, award_id);

-- ── 4. Results stay sealed until the scheduled reveal ──────────────────────
drop policy if exists "Members can read results" on public.award_results;
drop policy if exists "Members read award results" on public.award_results;
drop policy if exists "Members read results after the reveal" on public.award_results;
create policy "Members read results after the reveal"
  on public.award_results for select to authenticated
  using (
    public.is_guild_member(public.festival_guild(festival_id))
    and (
      public.is_guild_president(public.festival_guild(festival_id))
      or (select coalesce(f.ceremony_at, f.created_at) <= now()
          from public.festivals f where f.id = festival_id)
    )
  );

-- ── 5. The Best Review shortlist: top ten eligible reviews of the season ───
create or replace function public.best_review_candidates(fid uuid)
returns table (
  review_id uuid,
  user_id uuid,
  tmdb_id int,
  body text,
  upvotes bigint
)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.user_id, r.tmdb_id, r.body, count(v.id)
  from public.reviews r
  left join public.review_votes v on v.review_id = r.id
  where r.festival_id = fid
    and r.eligible
    and public.is_guild_member(public.festival_guild(fid))
  group by r.id
  order by count(v.id) desc, r.created_at asc
  limit 10;
$$;

-- ── 6. Publish, v2 ─────────────────────────────────────────────────────────
-- Ties stand (every top row is written). The missed-film penalty bites the
-- two awards that count: a delinquent curator's film cannot take the
-- scoring award, and a delinquent critic cannot take Best Critic. Honorary
-- awards stay honorary — no penalty. Best Critic = revealed leaderboard
-- points plus one point per Best Review ballot vote on your reviews.
create or replace function public.publish_festival_v2(fid uuid, reveal_at timestamptz default now())
returns void
language plpgsql security definer set search_path = ''
as $$
declare award record; max_votes int; max_score bigint;
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can publish';
  end if;
  if public.festival_state(fid) <> 'AWARDS_VOTING' then
    raise exception 'Festival is not in awards voting';
  end if;

  create temp table _delinquents on commit drop as
    select user_id from public.festival_misses(fid);

  for award in
    select fa.award_id, fa.scoring
    from public.festival_awards fa where fa.festival_id = fid
  loop
    select max(c) into max_votes from (
      select count(*) as c from public.votes v
      where v.festival_id = fid and v.award_id = award.award_id
        and (not award.scoring or not exists (
          select 1 from public.lineup_films l
          join _delinquents d on d.user_id = l.curator_id
          where l.festival_id = fid and l.tmdb_id = v.tmdb_id))
      group by v.tmdb_id
    ) t;
    if max_votes is null then continue; end if;

    insert into public.award_results
      (festival_id, award_id, tmdb_id, votes, total_votes, curator_id)
    select fid, award.award_id, v.tmdb_id, count(*)::int,
           (select count(*) from public.votes
             where festival_id = fid and award_id = award.award_id)::int,
           (select l.curator_id from public.lineup_films l
             where l.festival_id = fid and l.tmdb_id = v.tmdb_id)
    from public.votes v
    where v.festival_id = fid and v.award_id = award.award_id
      and (not award.scoring or not exists (
        select 1 from public.lineup_films l
        join _delinquents d on d.user_id = l.curator_id
        where l.festival_id = fid and l.tmdb_id = v.tmdb_id))
    group by v.tmdb_id
    having count(*) = max_votes;
  end loop;

  -- Best Critic: points from the board plus the Best Review ballots.
  create temp table _critic_scores on commit drop as
    select s.user_id,
           s.points
           + coalesce((select count(*) from public.votes bv
                       join public.reviews br on br.id = bv.review_id
                       where bv.festival_id = fid
                         and bv.award_id = 'best-review'
                         and br.user_id = s.user_id), 0) as score
    from public.critic_standings_v2(fid) s
    where s.user_id not in (select user_id from _delinquents);

  select max(score) into max_score from _critic_scores;
  if max_score is not null and max_score > 0 then
    insert into public.award_results
      (festival_id, award_id, tmdb_id, votes, total_votes, winner_id)
    select fid, 'best-critic', null, score::int,
           (select count(*) from public.votes
             where festival_id = fid and award_id = 'best-review')::int,
           user_id
    from _critic_scores
    where score = max_score;
  end if;

  update public.festivals
     set state = 'CEREMONY',
         ceremony_at = greatest(reveal_at, now())
   where id = fid;
end;
$$;

notify pgrst, 'reload schema';
