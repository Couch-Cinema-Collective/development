-- Couch Cinema Collective — unstick festivals that were "opened" but never started.
-- Run AFTER schema-10-calendar-schedule.sql. Idempotent.
--
-- schema-09 cleared future-dated schedules, but only for festivals sitting in
-- LINEUP_SET. That missed the ones this actually happened to: under the old
-- code, "announce the opening" set state = 'SCREENING' directly, so a festival
-- whose first film was scheduled a day out ended up marked as screening with
-- nothing screening. The dashboard then showed a countdown to a start time
-- nobody had chosen, and the president was offered the awards ballot rather
-- than a way to open the thing.
--
-- A festival whose first film has not started yet is not open, whatever its
-- state column says. This finds those by the clock rather than by the state,
-- clears the schedule, and returns them to LINEUP_SET so the president gets
-- the Open button.

set check_function_bodies = off;

with unstarted as (
  select f.id
  from public.festivals f
  where f.state in ('LINEUP_SET', 'SCREENING')
    -- It has a lineup...
    and exists (
      select 1 from public.lineup_films l where l.festival_id = f.id
    )
    -- ...but not one frame of it has actually begun.
    and not exists (
      select 1 from public.lineup_films l
      where l.festival_id = f.id
        and l.viewing_starts_at is not null
        and l.viewing_starts_at <= now()
    )
)
update public.lineup_films l
   set viewing_starts_at = null,
       review_starts_at  = null,
       voting_starts_at  = null,
       closes_at         = null
 where l.festival_id in (select id from unstarted);

with unstarted as (
  select f.id
  from public.festivals f
  where f.state in ('LINEUP_SET', 'SCREENING')
    and exists (
      select 1 from public.lineup_films l where l.festival_id = f.id
    )
    and not exists (
      select 1 from public.lineup_films l
      where l.festival_id = f.id
        and l.viewing_starts_at is not null
        and l.viewing_starts_at <= now()
    )
)
update public.festivals
   set state = 'LINEUP_SET', screening_starts_at = null
 where id in (select id from unstarted);

notify pgrst, 'reload schema';
