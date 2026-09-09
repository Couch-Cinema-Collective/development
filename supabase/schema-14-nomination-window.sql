-- Couch Cinema Collective — festival v2, slice 2 (FESTIVAL-SPEC.md):
-- everyone nominates, the live anonymous grid, and rank-choice narrowing.
-- Idempotent: safe to re-run. Apply after schema-13-festival-v2.sql.

-- ---------------------------------------------------------------------------
-- 1. Everyone nominates. Curatorship is an OUTCOME now — the nominators of
--    selected films — not a seat you claim on the way in.
-- ---------------------------------------------------------------------------
drop policy if exists "Curators nominate during NOMINATING" on public.nominations;
drop policy if exists "Members nominate during NOMINATING" on public.nominations;
create policy "Members nominate during NOMINATING"
  on public.nominations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.festival_guild(festival_id))
    and public.festival_state(festival_id) = 'NOMINATING'
  );

-- ---------------------------------------------------------------------------
-- 2. The RANKING state, between NOMINATING and LINEUP_SET, used only when
--    more films were nominated than the festival can screen.
-- ---------------------------------------------------------------------------
alter table public.festivals drop constraint if exists festivals_state_check;
alter table public.festivals add constraint festivals_state_check
  check (state in (
    'DRAFT', 'RECRUITING', 'NOMINATING', 'RANKING', 'LINEUP_SET',
    'SCREENING', 'AWARDS_VOTING', 'CEREMONY', 'ARCHIVED'
  ));

alter table public.festivals
  add column if not exists ranking_closes_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. The live grid: every nomination in the festival, anonymously. Rows
--    carry user_id, so members read through this definer function instead.
-- ---------------------------------------------------------------------------
create or replace function public.nomination_grid(fid uuid)
returns table (tmdb_id int, film jsonb, pitch text, locked boolean, claimed_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select n.tmdb_id, n.film, n.pitch, n.locked, n.created_at
  from public.nominations n
  where n.festival_id = fid
    and public.is_guild_member(public.festival_guild(fid))
  order by n.created_at;
$$;

-- ---------------------------------------------------------------------------
-- 4. Rank ballots. One row per (member, film); rank 1 is the top choice.
--    Ballots are secret: readable only by their owner, tallied in Postgres.
-- ---------------------------------------------------------------------------
create table if not exists public.rank_ballots (
  festival_id uuid not null references public.festivals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id int not null,
  rank int not null check (rank between 1 and 64),
  created_at timestamptz not null default now(),
  primary key (festival_id, user_id, tmdb_id),
  unique (festival_id, user_id, rank)
);

alter table public.rank_ballots enable row level security;

drop policy if exists "Own rank ballot readable" on public.rank_ballots;
create policy "Own rank ballot readable"
  on public.rank_ballots for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Rank during RANKING" on public.rank_ballots;
create policy "Rank during RANKING"
  on public.rank_ballots for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.festival_guild(festival_id))
    and public.festival_state(festival_id) = 'RANKING'
  );

drop policy if exists "Rerank during RANKING" on public.rank_ballots;
create policy "Rerank during RANKING"
  on public.rank_ballots for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.festival_state(festival_id) = 'RANKING'
  );

-- ---------------------------------------------------------------------------
-- 5. NOMINATING → RANKING. Only meaningful when the locked nominations
--    outnumber the target; the server action falls back to a straight draw
--    when they don't.
-- ---------------------------------------------------------------------------
create or replace function public.close_nominations(fid uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare target int; locked_count int;
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can close nominations';
  end if;
  if public.festival_state(fid) <> 'NOMINATING' then
    raise exception 'Nominations are not open';
  end if;

  select film_count into target from public.festivals where id = fid;
  select count(*) into locked_count
  from public.nominations where festival_id = fid and locked;

  if locked_count <= greatest(coalesce(target, 0), 1) then
    raise exception 'NOTHING_TO_RANK';
  end if;

  update public.festivals
     set state = 'RANKING',
         ranking_closes_at = now() + interval '24 hours'
   where id = fid;

  return locked_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Instant-runoff narrowing. Repeatedly eliminate the film with the
--    fewest top-choice votes among survivors until the target remains.
--    Unranked films earn nothing; elimination ties break against the film
--    claimed latest (first come survives, matching the claiming rule).
-- ---------------------------------------------------------------------------
create or replace function public.rank_choice_survivors(fid uuid)
returns setof int
language plpgsql stable security definer set search_path = ''
as $$
declare target int; alive int[]; loser int;
begin
  select film_count into target from public.festivals where id = fid;

  select coalesce(array_agg(tmdb_id order by created_at), '{}')
    into alive
  from public.nominations
  where festival_id = fid and locked;

  if target is null or coalesce(array_length(alive, 1), 0) <= target then
    return query select unnest(alive);
    return;
  end if;

  while array_length(alive, 1) > target loop
    select t.tmdb into loser
    from (
      select a.tmdb,
             (select count(*)
              from public.rank_ballots rb
              where rb.festival_id = fid
                and rb.tmdb_id = a.tmdb
                and rb.rank = (
                  select min(rb2.rank) from public.rank_ballots rb2
                  where rb2.festival_id = fid
                    and rb2.user_id = rb.user_id
                    and rb2.tmdb_id = any (alive)
                )) as firsts,
             (select n.created_at from public.nominations n
              where n.festival_id = fid and n.tmdb_id = a.tmdb) as claimed
      from unnest(alive) as a (tmdb)
    ) t
    order by t.firsts asc, t.claimed desc
    limit 1;

    alive := array_remove(alive, loser);
  end loop;

  return query select unnest(alive);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. set_lineup() learns the RANKING path: from NOMINATING it draws every
--    locked film as before; from RANKING it draws the rank-choice survivors.
-- ---------------------------------------------------------------------------
create or replace function public.set_lineup(fid uuid, starts_at timestamptz default null)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  n int := 0;
  nom record;
  ranked boolean;
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can set the lineup';
  end if;
  if public.festival_state(fid) not in ('NOMINATING', 'RANKING') then
    raise exception 'Nominations are not open';
  end if;
  ranked := public.festival_state(fid) = 'RANKING';

  delete from public.lineup_films where festival_id = fid;

  for nom in
    select * from public.nominations
    where festival_id = fid and locked
      and (not ranked or tmdb_id in (select public.rank_choice_survivors(fid)))
    order by random()
  loop
    n := n + 1;
    insert into public.lineup_films (
      festival_id, tmdb_id, film, position, curator_id,
      viewing_starts_at, review_starts_at, voting_starts_at, closes_at
    ) values (
      fid, nom.tmdb_id, nom.film, n, nom.user_id,
      null, null, null, null
    );
  end loop;

  if n = 0 then
    raise exception 'No curator has locked in a film yet';
  end if;

  update public.festivals
     set state = 'LINEUP_SET', film_count = n, screening_starts_at = null
   where id = fid;

  return n;
end;
$$;
