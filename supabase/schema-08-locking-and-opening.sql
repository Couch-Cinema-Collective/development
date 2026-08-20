-- Couch Cinema Collective — locked submissions, and a festival that actually
-- opens when the president opens it.
-- Run AFTER schema-07-open-curator-seats.sql. Idempotent.
--
-- Three things:
--   1. Nominations are locked in deliberately. Picking a film is a draft;
--      locking is the act that submits it to the programme.
--   2. set_lineup() no longer schedules the first film a day out, and
--      open_festival() re-stamps the whole schedule from the moment the
--      president opens it — so "announce the opening" opens something.
--   3. A PostgREST schema reload at the end, because a function nobody can
--      call is the same as a function that doesn't exist.

set check_function_bodies = off;

-- ── 1. Locking a submission ─────────────────────────────────────────────────
alter table public.nominations
  add column if not exists locked    boolean not null default false,
  add column if not exists locked_at timestamptz;

-- Rows that predate locking were submitted under rules where picking *was*
-- submitting, so they stay submitted.
update public.nominations
   set locked = true, locked_at = coalesce(locked_at, created_at)
 where locked = false and locked_at is null
   and festival_id in (
     select id from public.festivals
     where state <> 'NOMINATING'
   );

/**
 * Commit a pick to the programme.
 *
 * Deliberately one-way. The point of a separate lock step is that it means
 * something — a curator who can unlock and swap right up to the deadline is
 * back to the old behaviour with an extra click in front of it. Change your
 * mind before you lock; after that the film is in.
 */
create or replace function public.lock_nomination(fid uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Must be signed in';
  end if;
  if public.festival_state(fid) <> 'NOMINATING' then
    raise exception 'Nominations are not open';
  end if;
  if not exists (
    select 1 from public.nominations where festival_id = fid and user_id = uid
  ) then
    raise exception 'Pick a film before locking it in';
  end if;

  update public.nominations
     set locked = true, locked_at = now()
   where festival_id = fid and user_id = uid and not locked;
end;
$$;

-- A locked pick can no longer be changed or withdrawn.
drop policy if exists "Curators change their pick during NOMINATING" on public.nominations;
create policy "Curators change their pick during NOMINATING"
  on public.nominations for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.festival_state(festival_id) = 'NOMINATING'
    and not locked
  )
  with check (user_id = (select auth.uid()));

drop policy if exists "Curators withdraw during NOMINATING" on public.nominations;
create policy "Curators withdraw during NOMINATING"
  on public.nominations for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.festival_state(festival_id) = 'NOMINATING'
    and not locked
  );

-- Counts now report what has actually been submitted, not merely picked.
drop function if exists public.nomination_count(uuid);
create function public.nomination_count(fid uuid)
returns table (submitted bigint, picked bigint, expected bigint)
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from public.nominations
           where festival_id = fid and locked),
         (select count(*) from public.nominations where festival_id = fid),
         (select count(*) from public.guild_members
           where guild_id = public.festival_guild(fid)
             and role in ('president', 'curator'))
  where public.is_guild_member(public.festival_guild(fid));
$$;

-- ── 2. Drawing the lineup, and opening the festival ─────────────────────────
/**
 * Build the lineup from the locked submissions and stamp the schedule.
 *
 * Only locked picks make it in — that is what locking buys. Screening order
 * is shuffled: going in submission order would reward whoever filed first.
 *
 * `starts_at` now defaults to the moment it is called rather than a day out.
 * The old default meant a president could set the lineup, announce the
 * opening, and have nothing open for twenty-four hours.
 */
create or replace function public.set_lineup(fid uuid, starts_at timestamptz default null)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  n int := 0;
  cycle interval;
  f record;
  nom record;
  start_at timestamptz := coalesce(starts_at, now());
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can set the lineup';
  end if;
  if public.festival_state(fid) <> 'NOMINATING' then
    raise exception 'Nominations are not open';
  end if;

  select * into f from public.festivals where id = fid;
  cycle := make_interval(days => f.viewing_days + f.review_days)
         + make_interval(hours => f.voting_hours);

  delete from public.lineup_films where festival_id = fid;

  for nom in
    select * from public.nominations
    where festival_id = fid and locked
    order by random()
  loop
    n := n + 1;
    insert into public.lineup_films (
      festival_id, tmdb_id, film, position, curator_id,
      viewing_starts_at, review_starts_at, voting_starts_at, closes_at
    ) values (
      fid, nom.tmdb_id, nom.film, n, nom.user_id,
      start_at + (n - 1) * cycle,
      start_at + (n - 1) * cycle + make_interval(days => f.viewing_days),
      start_at + (n - 1) * cycle
        + make_interval(days => f.viewing_days + f.review_days),
      start_at + n * cycle
    );
  end loop;

  if n = 0 then
    raise exception 'No curator has locked in a film yet';
  end if;

  update public.festivals
     set state = 'LINEUP_SET', film_count = n, screening_starts_at = start_at
   where id = fid;

  return n;
end;
$$;

/**
 * Open the festival: re-stamp the entire schedule from now and start screening.
 *
 * The president may sit on a drawn lineup for days while the last curators
 * trickle in, so the schedule is recomputed at the moment they open rather
 * than honouring whatever was stamped when the lineup was drawn. Opening the
 * festival should open the first film, immediately and visibly.
 */
create or replace function public.open_festival(fid uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  f record;
  cycle interval;
  n int := 0;
  row_ record;
  start_at timestamptz := now();
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can open the festival';
  end if;
  if public.festival_state(fid) not in ('LINEUP_SET', 'SCREENING') then
    raise exception 'The lineup has not been drawn yet';
  end if;

  select * into f from public.festivals where id = fid;
  cycle := make_interval(days => f.viewing_days + f.review_days)
         + make_interval(hours => f.voting_hours);

  for row_ in
    select tmdb_id, position from public.lineup_films
    where festival_id = fid order by position
  loop
    n := n + 1;
    update public.lineup_films
       set viewing_starts_at = start_at + (n - 1) * cycle,
           review_starts_at  = start_at + (n - 1) * cycle
                             + make_interval(days => f.viewing_days),
           voting_starts_at  = start_at + (n - 1) * cycle
                             + make_interval(days => f.viewing_days + f.review_days),
           closes_at         = start_at + n * cycle
     where festival_id = fid and tmdb_id = row_.tmdb_id;
  end loop;

  if n = 0 then
    raise exception 'There is nothing in the lineup to open';
  end if;

  update public.festivals
     set state = 'SCREENING', screening_starts_at = start_at
   where id = fid;

  return n;
end;
$$;

-- ── 3. Make sure the API can actually see all of this ───────────────────────
-- set_curator_seats() was reported missing from the schema cache: PostgREST
-- keeps its own view of available functions and does not always notice a new
-- one. Re-declared here so this migration is sufficient on its own, then the
-- cache is told to reload.
create or replace function public.set_curator_seats(gid uuid, seats int)
returns int
language plpgsql security definer set search_path = ''
as $$
declare taken int;
begin
  if not public.is_guild_president(gid) then
    raise exception 'Only the guild president can set curator seats';
  end if;

  if seats < 4 or seats > 12 then
    raise exception 'A guild seats between 4 and 12 curators';
  end if;

  select count(*) into taken from public.guild_members
  where guild_id = gid and role in ('president', 'curator');

  if seats < taken then
    raise exception
      'There are already % curators seated — remove one before cutting to %.',
      taken, seats;
  end if;

  update public.guilds set max_curators = seats where id = gid;
  return seats;
end;
$$;

grant execute on function public.set_curator_seats(uuid, int) to authenticated;
grant execute on function public.lock_nomination(uuid)         to authenticated;
grant execute on function public.open_festival(uuid)           to authenticated;
grant execute on function public.set_lineup(uuid, timestamptz) to authenticated;
grant execute on function public.nomination_count(uuid)        to authenticated;

notify pgrst, 'reload schema';
