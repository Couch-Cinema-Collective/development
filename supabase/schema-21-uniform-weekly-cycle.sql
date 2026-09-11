-- Couch Cinema Collective — one film, one week, no exceptions.
--
-- open_festival() previously anchored film one to the next real-calendar
-- Sunday, pushing a whole extra week out whenever that landed too close
-- (opening on a Friday or Saturday could leave film one running 8-9 days,
-- spanning two weekends) before settling every later film into a Wednesday-
-- Monday-Wednesday rhythm. That raggedness is gone: every film, including
-- the first, now runs a flat five days to watch and write, two days for
-- critics to vote — seven days, always, from the moment it opens, with the
-- next film opening the instant the previous one closes.
-- Idempotent. Apply after schema-20.

create or replace function public.open_festival(fid uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  start_at   timestamptz := now();
  view_start timestamptz;
  vote_start timestamptz;
  close_at   timestamptz;
  n int := 0;
  row_ record;
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can open the festival';
  end if;
  if public.festival_state(fid) not in ('LINEUP_SET', 'SCREENING') then
    raise exception 'The lineup has not been drawn yet';
  end if;

  view_start := start_at;

  for row_ in
    select tmdb_id from public.lineup_films
    where festival_id = fid order by position
  loop
    n := n + 1;

    vote_start := view_start + interval '5 days';
    close_at   := vote_start + interval '2 days';

    update public.lineup_films
       set viewing_starts_at = view_start,
           -- No separate review period: writing closes when voting opens.
           review_starts_at  = vote_start,
           voting_starts_at  = vote_start,
           closes_at         = close_at
     where festival_id = fid and tmdb_id = row_.tmdb_id;

    -- The next film opens the instant this one closes.
    view_start := close_at;
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

grant execute on function public.open_festival(uuid) to authenticated;
