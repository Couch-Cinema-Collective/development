-- Couch Cinema Collective — the festival runs on a calendar, not a stopwatch.
-- Run AFTER schema-09-open-immediately.sql. Idempotent.
--
-- The schedule is now fixed and anchored to Pacific time:
--
--   Film 1   opens the instant the president opens the festival, and screens
--            until midnight at the end of the SECOND Sunday after that.
--   Mon-Wed  critics vote on the reviews. Closes Wednesday midnight.
--   Film 2+  opens Thursday 00:00 and screens until midnight at the end of
--            the Sunday ten days later, then Mon-Wed voting again.
--
-- After the first film that settles into an exact fortnight, week-aligned, so
-- every film opens on a Thursday morning and every voting window is Mon-Wed.
--
-- Reviews are written DURING the viewing window rather than in a separate
-- period afterwards: voting opens Monday, and you cannot vote on reviews that
-- are still being written. So review_starts_at and voting_starts_at are the
-- same instant, and screening_phase() simply skips REVIEWING.
--
-- Boundaries are computed from local dates rather than by adding fixed
-- intervals, so a cycle that crosses a daylight-saving change still lands on
-- local midnight instead of drifting an hour.

set check_function_bodies = off;

/**
 * Open the festival and lay the whole schedule onto the Pacific calendar.
 *
 * Film one starts now; everything after it is week-aligned.
 */
create or replace function public.open_festival(fid uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  tz constant text := 'America/Los_Angeles';
  start_at   timestamptz := now();
  open_local timestamp;
  d0            date;
  second_sunday date;
  n int := 0;
  row_ record;
  view_start_local timestamp;
  vote_start_local timestamp;
  close_local      timestamp;
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can open the festival';
  end if;
  if public.festival_state(fid) not in ('LINEUP_SET', 'SCREENING') then
    raise exception 'The lineup has not been drawn yet';
  end if;

  open_local := timezone(tz, start_at);
  d0 := open_local::date;

  -- The first Sunday STRICTLY after opening, then the one after that. Opening
  -- on a Sunday therefore runs to the Sunday a fortnight out, not that night.
  second_sunday := d0 + (7 - extract(dow from d0)::int) + 7;

  view_start_local := open_local;

  for row_ in
    select tmdb_id from public.lineup_films
    where festival_id = fid order by position
  loop
    n := n + 1;

    if n = 1 then
      -- Midnight at the END of that Sunday is 00:00 the following Monday.
      vote_start_local := (second_sunday + 1)::timestamp;
    else
      -- Thursday 00:00 + 11 days = the Monday after the second Sunday.
      vote_start_local := (view_start_local::date + 11)::timestamp;
    end if;

    -- Monday 00:00 through Wednesday midnight, which is 00:00 Thursday.
    close_local := (vote_start_local::date + 3)::timestamp;

    update public.lineup_films
       set viewing_starts_at = timezone(tz, view_start_local),
           -- No separate review period: writing closes when voting opens.
           review_starts_at  = timezone(tz, vote_start_local),
           voting_starts_at  = timezone(tz, vote_start_local),
           closes_at         = timezone(tz, close_local)
     where festival_id = fid and tmdb_id = row_.tmdb_id;

    -- The next film opens the moment this one closes: Thursday 00:00.
    view_start_local := close_local;
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

-- The cadence columns no longer drive anything; the calendar above does.
-- They are left in place rather than dropped so existing rows and any
-- historical festival keep their record of what was originally intended.
comment on column public.festivals.viewing_days is
  'Historical. The schedule is fixed by open_festival(); see schema-10.';
comment on column public.festivals.review_days is
  'Historical. Reviews are written during the viewing window; see schema-10.';
comment on column public.festivals.voting_hours is
  'Historical. Voting is Mon-Wed Pacific; see schema-10.';

grant execute on function public.open_festival(uuid) to authenticated;

notify pgrst, 'reload schema';
