-- Couch Cinema Collective — let the president skip ahead once everyone's
-- watched, instead of waiting out the clock.
--
-- Writing already closes the instant voting opens (see schema-15's
-- open_festival: review_starts_at and voting_starts_at are always equal —
-- there is no standalone review window). Advancing early follows the same
-- shape: viewing ends now, voting opens now, and the same amount of time
-- saved is carried into every film still ahead so the festival's rhythm
-- holds rather than drifting later week over week.
-- Idempotent. Apply after schema-19.

create or replace function public.advance_screening(fid uuid, tid int)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  cur_view_start timestamptz;
  old_vote_start timestamptz;
  shift interval;
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can do this';
  end if;

  if public.screening_phase(fid, tid) <> 'VIEWING' then
    raise exception 'This film is not currently in its viewing window';
  end if;

  if (select count(*) from public.watch_records w
      where w.festival_id = fid and w.tmdb_id = tid) <
     (select count(*) from public.guild_members gm
      where gm.guild_id = public.festival_guild(fid)) then
    raise exception 'Not everyone has watched this film yet';
  end if;

  select viewing_starts_at, voting_starts_at into cur_view_start, old_vote_start
    from public.lineup_films
   where festival_id = fid and tmdb_id = tid;

  shift := old_vote_start - now();
  if shift <= interval '0' then
    raise exception 'This film has already moved past viewing';
  end if;

  -- This film: writing closes and voting opens right now.
  update public.lineup_films
     set review_starts_at = now(),
         voting_starts_at = now(),
         closes_at        = closes_at - shift
   where festival_id = fid and tmdb_id = tid;

  -- Everything still ahead — matched by its own start, not by position,
  -- since position on older rows has not always been trustworthy — moves
  -- earlier by the same amount, keeping each film's window length exactly
  -- as originally scheduled.
  update public.lineup_films
     set viewing_starts_at = viewing_starts_at - shift,
         review_starts_at  = review_starts_at - shift,
         voting_starts_at  = voting_starts_at - shift,
         closes_at         = closes_at - shift
   where festival_id = fid and viewing_starts_at > cur_view_start;
end;
$$;

grant execute on function public.advance_screening(uuid, int) to authenticated;
