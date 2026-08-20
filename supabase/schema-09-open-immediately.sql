-- Couch Cinema Collective — drawing the lineup no longer starts a clock.
-- Run AFTER schema-08-locking-and-opening.sql. Idempotent.
--
-- Previously set_lineup() stamped the whole schedule when the lineup was
-- drawn, which meant a festival had a running clock before anyone had opened
-- it, and members saw a countdown to a start time the president had not chosen
-- yet. Worse, that stamp defaulted a day out, so opening the festival appeared
-- to do nothing.
--
-- Now the two steps say what they do: drawing the lineup decides what screens
-- and in what order, and opening the festival starts it — immediately, from
-- the moment the button is pressed.

set check_function_bodies = off;

/**
 * Draw the lineup from the locked submissions. Order only, no schedule.
 *
 * Every window is left null, which screening_phase() already reads as
 * UPCOMING, so nothing is running and no countdown can be shown against a
 * time nobody picked.
 */
create or replace function public.set_lineup(fid uuid, starts_at timestamptz default null)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  n int := 0;
  nom record;
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can set the lineup';
  end if;
  if public.festival_state(fid) <> 'NOMINATING' then
    raise exception 'Nominations are not open';
  end if;

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
      null, null, null, null
    );
  end loop;

  if n = 0 then
    raise exception 'No curator has locked in a film yet';
  end if;

  -- starts_at is accepted and ignored: the caller no longer chooses a start,
  -- open_festival() does. Kept in the signature so existing calls still bind.
  update public.festivals
     set state = 'LINEUP_SET', film_count = n, screening_starts_at = null
   where id = fid;

  return n;
end;
$$;

/**
 * Open the festival. The first film opens now — not tomorrow, not on the next
 * tick of anything.
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
    select tmdb_id from public.lineup_films
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

-- Any festival left mid-flight by the old behaviour: if it was drawn but the
-- clock is still in the future, clear the schedule so the president can open
-- it properly rather than waiting out a start time they never chose.
update public.lineup_films l
   set viewing_starts_at = null,
       review_starts_at  = null,
       voting_starts_at  = null,
       closes_at         = null
  from public.festivals f
 where f.id = l.festival_id
   and f.state = 'LINEUP_SET'
   and l.viewing_starts_at > now();

update public.festivals
   set screening_starts_at = null
 where state = 'LINEUP_SET' and screening_starts_at > now();

grant execute on function public.set_lineup(uuid, timestamptz) to authenticated;
grant execute on function public.open_festival(uuid)           to authenticated;

notify pgrst, 'reload schema';
