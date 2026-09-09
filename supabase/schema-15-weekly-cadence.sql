-- Couch Cinema Collective — festival v2, slice 3 (FESTIVAL-SPEC.md):
-- one film per week, no exceptions. Wednesday to Sunday to watch and
-- review, Monday and Tuesday to vote, Wednesday the points land and the
-- next film opens. Plus the missed-film penalty and a leaderboard that
-- only counts revealed weeks. Idempotent. Apply after schema-14.

set check_function_bodies = off;

/**
 * Open the festival onto the weekly Pacific calendar.
 *
 * Film one opens the instant the president presses the button and screens
 * until the first Sunday midnight that gives at least three clear days —
 * open on a Friday and the guild gets until the Sunday after next. Every
 * later film runs Wednesday 00:00 → Sunday midnight, votes Monday-Tuesday,
 * and closes Wednesday 00:00 as its successor opens.
 *
 * Boundaries come from local dates, not fixed intervals, so daylight-saving
 * changes land on local midnight instead of drifting an hour.
 */
create or replace function public.open_festival(fid uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  tz constant text := 'America/Los_Angeles';
  start_at   timestamptz := now();
  open_local timestamp;
  d0           date;
  first_sunday date;
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

  -- The first Sunday STRICTLY after opening…
  first_sunday := d0 + (case when extract(dow from d0)::int = 0
                             then 7
                             else 7 - extract(dow from d0)::int end);
  -- …pushed a week out when it would leave fewer than three clear days.
  if first_sunday - d0 < 3 then
    first_sunday := first_sunday + 7;
  end if;

  view_start_local := open_local;

  for row_ in
    select tmdb_id from public.lineup_films
    where festival_id = fid order by position
  loop
    n := n + 1;

    if n = 1 then
      -- Midnight ending that Sunday is 00:00 the following Monday.
      vote_start_local := (first_sunday + 1)::timestamp;
    else
      -- Wednesday 00:00 + 5 days = Monday 00:00.
      vote_start_local := (view_start_local::date + 5)::timestamp;
    end if;

    -- Monday 00:00 through Tuesday midnight, which is 00:00 Wednesday.
    close_local := (vote_start_local::date + 2)::timestamp;

    update public.lineup_films
       set viewing_starts_at = timezone(tz, view_start_local),
           -- No separate review period: writing closes when voting opens.
           review_starts_at  = timezone(tz, vote_start_local),
           voting_starts_at  = timezone(tz, vote_start_local),
           closes_at         = timezone(tz, close_local)
     where festival_id = fid and tmdb_id = row_.tmdb_id;

    -- The next film opens the moment this one closes: Wednesday 00:00.
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

grant execute on function public.open_festival(uuid) to authenticated;

/**
 * The Best Critic leaderboard, counting only revealed weeks: a film's
 * upvotes join the board when it closes on Wednesday, never while its
 * ballot is still live. The spend-all rule carries to both kinds — a
 * review only scores if its author spent all three Insightful and all
 * three Funniest on that film.
 */
create or replace function public.critic_standings_v2(fid uuid)
returns table (user_id uuid, points bigint, reviews_written bigint)
language sql stable security definer set search_path = ''
as $$
  select r.user_id,
         count(v.id),
         count(distinct r.id)
  from public.reviews r
  join public.lineup_films lf
    on lf.festival_id = r.festival_id and lf.tmdb_id = r.tmdb_id
  left join public.review_votes v on v.review_id = r.id
  where r.festival_id = fid
    and r.eligible
    and lf.closes_at is not null and lf.closes_at <= now()
    and public.is_guild_member(public.festival_guild(fid))
    and (select count(*) from public.review_votes vi
         join public.reviews ri on ri.id = vi.review_id
         where vi.user_id = r.user_id and vi.kind = 'insightful'
           and ri.festival_id = fid and ri.tmdb_id = r.tmdb_id) >= 3
    and (select count(*) from public.review_votes vf
         join public.reviews rf on rf.id = vf.review_id
         where vf.user_id = r.user_id and vf.kind = 'funniest'
           and rf.festival_id = fid and rf.tmdb_id = r.tmdb_id) >= 3
  group by r.user_id
  order by 2 desc, 3 desc;
$$;

/**
 * The penalty ledger: who failed to mark a film watched before its window
 * shut, and how many times. Missing a film keeps you in the game — votes
 * and reviews still count — but you can no longer win (publish-time rule).
 */
create or replace function public.festival_misses(fid uuid)
returns table (user_id uuid, missed bigint)
language sql stable security definer set search_path = ''
as $$
  select gm.user_id, count(lf.tmdb_id)
  from public.guild_members gm
  cross join public.lineup_films lf
  where gm.guild_id = public.festival_guild(fid)
    and lf.festival_id = fid
    and lf.voting_starts_at is not null
    and lf.voting_starts_at <= now()
    and public.is_guild_member(public.festival_guild(fid))
    and not exists (
      select 1 from public.watch_records w
      where w.festival_id = fid
        and w.user_id = gm.user_id
        and w.tmdb_id = lf.tmdb_id
        and w.watched_at < lf.voting_starts_at
    )
  group by gm.user_id
  having count(lf.tmdb_id) > 0;
$$;

notify pgrst, 'reload schema';
