-- Couch Cinema Collective — the guild/festival model.
-- Run AFTER schema-05-push.sql, in the Supabase SQL Editor. Idempotent.
--
-- This migration replaces the season model (five nomination points, a weighted
-- slate algorithm, one ballot at the end) with the festival model:
--
--   * Guilds hold 4–12 curators plus a voting body of up to 50 critics.
--   * Each curator nominates exactly one film, so the lineup is the roster.
--   * Films screen one at a time on a repeating clock: a viewing period, then
--     a review period, then a 24-hour critics' voting window.
--   * Reviews are 200 characters and anonymous until their window shuts.
--   * Each critic spends exactly 3 upvotes per film; spend fewer and your own
--     review stops being eligible to receive them.
--   * Best of the Fest is the only award that scores. The rest are honorary.
--
-- Renames are used throughout rather than drops, so existing rows survive.

set check_function_bodies = off;

-- ── 1. Rename the season vocabulary to the festival vocabulary ──────────────
do $$
begin
  if to_regclass('public.seasons') is not null
     and to_regclass('public.festivals') is null then
    alter table public.seasons rename to festivals;
  end if;

  if to_regclass('public.slate_films') is not null
     and to_regclass('public.lineup_films') is null then
    alter table public.slate_films rename to lineup_films;
  end if;

  if to_regclass('public.season_awards') is not null
     and to_regclass('public.festival_awards') is null then
    alter table public.season_awards rename to festival_awards;
  end if;
end $$;

-- season_id → festival_id everywhere it appears.
do $$
declare t text;
begin
  foreach t in array array[
    'festival_awards', 'nominations', 'lineup_films',
    'watch_records', 'reviews', 'votes', 'award_results'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t
        and column_name = 'season_id'
    ) then
      execute format(
        'alter table public.%I rename column season_id to festival_id', t
      );
    end if;
  end loop;
end $$;

-- ── 2. Guild capacity: curators and critics are counted separately ──────────
alter table public.guilds
  add column if not exists max_curators int not null default 12,
  add column if not exists max_critics  int not null default 50;

do $$
begin
  alter table public.guilds drop constraint if exists guilds_max_curators_check;
  alter table public.guilds add constraint guilds_max_curators_check
    check (max_curators between 4 and 12);
  alter table public.guilds drop constraint if exists guilds_max_critics_check;
  alter table public.guilds add constraint guilds_max_critics_check
    check (max_critics between 0 and 50);
end $$;

-- ── 3. Roles: president / curator / critic, and curator approval ────────────
alter table public.guild_members
  add column if not exists status text not null default 'active';

-- Migrate the old two-role model before tightening the constraint.
alter table public.guild_members drop constraint if exists guild_members_role_check;
update public.guild_members set role = 'president' where role = 'commissioner';
update public.guild_members set role = 'critic'    where role = 'member';

alter table public.guild_members
  add constraint guild_members_role_check
  check (role in ('president', 'curator', 'critic'));

alter table public.guild_members drop constraint if exists guild_members_status_check;
alter table public.guild_members
  add constraint guild_members_status_check
  check (status in ('active', 'pending'));

-- The president is a curator who founded the guild; both curate.
create or replace function public.is_guild_president(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = gid
      and user_id = (select auth.uid())
      and role = 'president'
      and status = 'active'
  );
$$;

create or replace function public.is_guild_curator(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = gid
      and user_id = (select auth.uid())
      and role in ('president', 'curator')
      and status = 'active'
  );
$$;

-- Pending curators are not yet members for any purpose but their own row.
create or replace function public.is_guild_member(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = gid
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

-- Kept so older policies referencing it keep resolving.
create or replace function public.is_guild_commissioner(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_guild_president(gid);
$$;

create or replace function public.festival_guild(fid uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select guild_id from public.festivals where id = fid;
$$;

create or replace function public.festival_state(fid uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select state from public.festivals where id = fid;
$$;

-- Legacy names, redirected rather than dropped (policies still call them).
create or replace function public.season_guild(sid uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select public.festival_guild(sid); $$;

create or replace function public.season_state(sid uuid)
returns text language sql stable security definer set search_path = ''
as $$ select public.festival_state(sid); $$;

-- Founders become president.
create or replace function public.handle_new_guild()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.guild_members (guild_id, user_id, role, status)
  values (new.id, new.created_by, 'president', 'active');
  return new;
end;
$$;

-- Caps are per-role now: 4–12 curators, up to 50 critics.
create or replace function public.enforce_guild_cap()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  curator_cap int;
  critic_cap  int;
  n int;
begin
  select max_curators, max_critics into curator_cap, critic_cap
  from public.guilds where id = new.guild_id;

  if new.role in ('president', 'curator') then
    select count(*) into n from public.guild_members
    where guild_id = new.guild_id
      and role in ('president', 'curator')
      and status = 'active';
    if n >= curator_cap then
      raise exception 'Guild is at its curator cap (% curators)', curator_cap;
    end if;
  else
    select count(*) into n from public.guild_members
    where guild_id = new.guild_id and role = 'critic' and status = 'active';
    if n >= critic_cap then
      raise exception 'Guild is at its critic cap (% critics)', critic_cap;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guild_cap_check on public.guild_members;
create trigger guild_cap_check
  before insert on public.guild_members
  for each row execute procedure public.enforce_guild_cap();

-- A promotion to curator has to respect the same cap as a fresh join.
create or replace function public.enforce_guild_cap_on_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare curator_cap int; n int;
begin
  if new.role in ('president', 'curator') and new.status = 'active'
     and (old.role not in ('president', 'curator') or old.status <> 'active') then
    select max_curators into curator_cap from public.guilds where id = new.guild_id;
    select count(*) into n from public.guild_members
    where guild_id = new.guild_id
      and role in ('president', 'curator')
      and status = 'active'
      and user_id <> new.user_id;
    if n >= curator_cap then
      raise exception 'Guild is at its curator cap (% curators)', curator_cap;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guild_cap_update_check on public.guild_members;
create trigger guild_cap_update_check
  before update on public.guild_members
  for each row execute procedure public.enforce_guild_cap_on_update();

-- Applicants must be able to see their own pending row to know they applied.
drop policy if exists "Members can see the roster" on public.guild_members;
create policy "Members can see the roster"
  on public.guild_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_guild_member(guild_id)
  );

drop policy if exists "Commissioners can change roles" on public.guild_members;
drop policy if exists "Presidents can change roles" on public.guild_members;
create policy "Presidents can change roles"
  on public.guild_members for update to authenticated
  using (public.is_guild_president(guild_id))
  with check (public.is_guild_president(guild_id));

drop policy if exists "Members can leave; commissioners can remove" on public.guild_members;
drop policy if exists "Members can leave; presidents can remove" on public.guild_members;
create policy "Members can leave; presidents can remove"
  on public.guild_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_guild_president(guild_id)
  );

-- ── 4. Festivals: theme, visibility, cadence ────────────────────────────────
alter table public.festivals
  add column if not exists theme               text not null default '',
  add column if not exists theme_family        text not null default 'custom',
  add column if not exists visibility          text not null default 'closed',
  add column if not exists screening_starts_at timestamptz,
  add column if not exists viewing_days        int  not null default 14,
  add column if not exists review_days         int  not null default 2,
  add column if not exists voting_hours        int  not null default 24;

-- Carry the old `category` text over as the theme name.
update public.festivals set theme = category where theme = '' and category <> '';

do $$
begin
  alter table public.festivals drop constraint if exists festivals_theme_family_check;
  alter table public.festivals add constraint festivals_theme_family_check
    check (theme_family in
      ('nations', 'filmmakers', 'genres', 'movements', 'eras', 'custom'));

  alter table public.festivals drop constraint if exists festivals_visibility_check;
  alter table public.festivals add constraint festivals_visibility_check
    check (visibility in ('open', 'closed'));

  alter table public.festivals drop constraint if exists festivals_cadence_check;
  alter table public.festivals add constraint festivals_cadence_check
    check (viewing_days between 1 and 60
       and review_days  between 1 and 14
       and voting_hours between 1 and 168);
end $$;

-- The weighted-slate columns have no meaning once each curator picks one film.
alter table public.festivals drop constraint if exists seasons_check;
alter table public.festivals
  drop column if exists w_guild,
  drop column if exists w_critic,
  drop column if exists eligibility;

-- The new state machine.
alter table public.festivals drop constraint if exists seasons_state_check;
alter table public.festivals drop constraint if exists festivals_state_check;

update public.festivals set state = case state
  when 'TALLYING'     then 'NOMINATING'
  when 'SLATE_LOCKED' then 'LINEUP_SET'
  when 'WATCHING'     then 'SCREENING'
  when 'VOTING'       then 'AWARDS_VOTING'
  when 'PUBLISHED'    then 'CEREMONY'
  else state
end;

alter table public.festivals add constraint festivals_state_check
  check (state in (
    'DRAFT', 'RECRUITING', 'NOMINATING', 'LINEUP_SET',
    'SCREENING', 'AWARDS_VOTING', 'CEREMONY', 'ARCHIVED'
  ));

-- One film per curator, so the lineup can never exceed the curator cap.
alter table public.festivals drop constraint if exists seasons_film_count_check;
alter table public.festivals drop constraint if exists festivals_film_count_check;
alter table public.festivals add constraint festivals_film_count_check
  check (film_count between 0 and 12);

drop policy if exists "Commissioners manage seasons" on public.festivals;
drop policy if exists "Presidents open festivals" on public.festivals;
create policy "Presidents open festivals"
  on public.festivals for insert to authenticated
  with check (
    public.is_guild_president(guild_id)
    and state in ('DRAFT', 'RECRUITING', 'NOMINATING')
  );

drop policy if exists "Commissioners update seasons" on public.festivals;
drop policy if exists "Presidents update festivals" on public.festivals;
create policy "Presidents update festivals"
  on public.festivals for update to authenticated
  using (public.is_guild_president(guild_id))
  -- The ceremony is reachable only through publish_festival().
  with check (public.is_guild_president(guild_id) and state <> 'CEREMONY');

-- Open festivals are discoverable by anyone signed in; closed ones are not.
drop policy if exists "Members can read seasons" on public.festivals;
drop policy if exists "Members read festivals" on public.festivals;
create policy "Members read festivals"
  on public.festivals for select to authenticated
  using (
    public.is_guild_member(guild_id)
    or (visibility = 'open' and state in ('RECRUITING', 'NOMINATING'))
  );

-- ── 5. Awards: Best of the Fest scores, everything else is honorary ─────────
alter table public.festival_awards
  add column if not exists scoring boolean not null default false;

alter table public.festival_awards drop constraint if exists season_awards_tier_check;
alter table public.festival_awards drop constraint if exists festival_awards_tier_check;
alter table public.festival_awards add constraint festival_awards_tier_check
  check (tier in
    ('craft', 'writing', 'custom', 'performance', 'direction', 'picture', 'critic'));

-- The old "picture" award becomes Best of the Fest, and is the one that counts.
update public.festival_awards
   set award_id = 'best-of-the-fest', name = 'Best of the Fest', scoring = true
 where award_id = 'picture';

update public.festival_awards set scoring = (award_id = 'best-of-the-fest');

-- Exactly one scoring award per festival — the thing the curators play for.
create unique index if not exists festival_awards_one_scoring
  on public.festival_awards (festival_id) where scoring;

drop policy if exists "Members can read season awards" on public.festival_awards;
drop policy if exists "Members read festival awards" on public.festival_awards;
create policy "Members read festival awards"
  on public.festival_awards for select to authenticated
  using (public.is_guild_member(public.festival_guild(festival_id)));

drop policy if exists "Commissioners manage season awards" on public.festival_awards;
drop policy if exists "Presidents manage festival awards" on public.festival_awards;
create policy "Presidents manage festival awards"
  on public.festival_awards for all to authenticated
  using (public.is_guild_president(public.festival_guild(festival_id)))
  with check (public.is_guild_president(public.festival_guild(festival_id)));

-- ── 6. Nominations: one film per curator ────────────────────────────────────
-- The five-point budget is gone, and with it the per-film primary key.
drop trigger if exists nomination_budget_check on public.nominations;
drop function if exists public.enforce_point_budget() cascade;
alter table public.nominations drop column if exists points;

-- Collapse any legacy multi-film stakes down to each curator's top pick.
delete from public.nominations n
 where exists (
   select 1 from public.nominations other
   where other.festival_id = n.festival_id
     and other.user_id = n.user_id
     and (other.created_at, other.tmdb_id) < (n.created_at, n.tmdb_id)
 );

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'nominations_pkey' and conrelid = 'public.nominations'::regclass
  ) then
    alter table public.nominations drop constraint nominations_pkey;
  end if;
  alter table public.nominations
    add constraint nominations_pkey primary key (festival_id, user_id);
end $$;

-- Only curators nominate, and only while nominations are open.
drop policy if exists "Members nominate during NOMINATING" on public.nominations;
drop policy if exists "Curators nominate during NOMINATING" on public.nominations;
create policy "Curators nominate during NOMINATING"
  on public.nominations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_curator(public.festival_guild(festival_id))
    and public.festival_state(festival_id) = 'NOMINATING'
  );

drop policy if exists "Members restake during NOMINATING" on public.nominations;
drop policy if exists "Curators change their pick during NOMINATING" on public.nominations;
create policy "Curators change their pick during NOMINATING"
  on public.nominations for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.festival_state(festival_id) = 'NOMINATING'
  )
  with check (user_id = (select auth.uid()));

drop policy if exists "Members withdraw during NOMINATING" on public.nominations;
drop policy if exists "Curators withdraw during NOMINATING" on public.nominations;
create policy "Curators withdraw during NOMINATING"
  on public.nominations for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.festival_state(festival_id) = 'NOMINATING'
  );

-- Who picked what stays hidden until the lineup is set.
drop policy if exists "Own always; others after lock" on public.nominations;
create policy "Own always; others after lock"
  on public.nominations for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      public.is_guild_member(public.festival_guild(festival_id))
      and public.festival_state(festival_id) in
        ('LINEUP_SET', 'SCREENING', 'AWARDS_VOTING', 'CEREMONY', 'ARCHIVED')
    )
  );

-- During NOMINATING, everyone sees the count without the titles.
drop function if exists public.nomination_pool(uuid);
drop function if exists public.nomination_count(uuid);
create function public.nomination_count(fid uuid)
returns table (submitted bigint, expected bigint)
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from public.nominations where festival_id = fid),
         (select count(*) from public.guild_members
           where guild_id = public.festival_guild(fid)
             and role in ('president', 'curator')
             and status = 'active')
  where public.is_guild_member(public.festival_guild(fid));
$$;

-- ── 7. The lineup, and the clock each film runs on ──────────────────────────
alter table public.lineup_films
  add column if not exists position            int,
  add column if not exists curator_id          uuid references auth.users (id) on delete set null,
  add column if not exists viewing_starts_at   timestamptz,
  add column if not exists review_starts_at    timestamptz,
  add column if not exists voting_starts_at    timestamptz,
  add column if not exists closes_at           timestamptz;

drop policy if exists "Commissioners set the slate" on public.lineup_films;
drop policy if exists "Presidents set the lineup" on public.lineup_films;
create policy "Presidents set the lineup"
  on public.lineup_films for all to authenticated
  using (public.is_guild_president(public.festival_guild(festival_id)))
  with check (public.is_guild_president(public.festival_guild(festival_id)));

drop policy if exists "Members can read the slate" on public.lineup_films;
drop policy if exists "Members read the lineup" on public.lineup_films;
create policy "Members read the lineup"
  on public.lineup_films for select to authenticated
  using (public.is_guild_member(public.festival_guild(festival_id)));

/**
 * Where a film sits in its own cycle, derived from the clock rather than
 * stored — no scheduled job has to tick anything over.
 */
create or replace function public.screening_phase(fid uuid, tid int)
returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when l.viewing_starts_at is null then 'UPCOMING'
    when now() <  l.viewing_starts_at then 'UPCOMING'
    when now() <  l.review_starts_at  then 'VIEWING'
    when now() <  l.voting_starts_at  then 'REVIEWING'
    when now() <  l.closes_at         then 'CRITICS_VOTING'
    else 'CLOSED'
  end
  from public.lineup_films l
  where l.festival_id = fid and l.tmdb_id = tid;
$$;

/**
 * Build the lineup from the curators' picks and start the clock.
 *
 * Every curator who nominated gets exactly one slot, so the lineup size is the
 * roster size. Screening order is shuffled: going in nomination order would
 * reward whoever picked first.
 */
create or replace function public.set_lineup(fid uuid, starts_at timestamptz)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  n int := 0;
  cycle interval;
  f record;
  nom record;
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
    select * from public.nominations where festival_id = fid order by random()
  loop
    n := n + 1;
    insert into public.lineup_films (
      festival_id, tmdb_id, film, position, curator_id,
      viewing_starts_at, review_starts_at, voting_starts_at, closes_at
    ) values (
      fid, nom.tmdb_id, nom.film, n, nom.user_id,
      starts_at + (n - 1) * cycle,
      starts_at + (n - 1) * cycle + make_interval(days => f.viewing_days),
      starts_at + (n - 1) * cycle
        + make_interval(days => f.viewing_days + f.review_days),
      starts_at + n * cycle
    );
  end loop;

  if n = 0 then
    raise exception 'No films were nominated';
  end if;

  update public.festivals
     set state = 'LINEUP_SET', film_count = n, screening_starts_at = starts_at
   where id = fid;

  return n;
end;
$$;

-- ── 8. Reviews: 200 characters, anonymous until the window shuts ────────────
alter table public.reviews alter column rating drop not null;
alter table public.reviews drop constraint if exists reviews_rating_check;

alter table public.reviews drop constraint if exists reviews_body_check;
alter table public.reviews add constraint reviews_body_check
  check (char_length(body) between 1 and 200);

-- Written after the review period closed: still welcome, just not in the running.
alter table public.reviews
  add column if not exists eligible boolean not null default true;

-- Reviews are readable only through film_reviews() below, which withholds the
-- author until the voting window shuts. Direct selects see your own row only.
drop policy if exists "Members read guild reviews" on public.reviews;
drop policy if exists "Reviewers read their own" on public.reviews;
create policy "Reviewers read their own"
  on public.reviews for select to authenticated
  using (user_id = (select auth.uid()));

-- A review can only be filed during its film's review period.
drop policy if exists "Members write own reviews" on public.reviews;
drop policy if exists "Critics write during the review period" on public.reviews;
create policy "Critics write during the review period"
  on public.reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.festival_guild(festival_id))
    -- Late reviews are allowed (flagged ineligible by trigger); early ones
    -- are not — the film has not opened yet.
    and public.screening_phase(festival_id, tmdb_id) <> 'UPCOMING'
  );

-- Reviews lock when their voting window opens; before that they are yours.
drop policy if exists "Members edit own reviews" on public.reviews;
drop policy if exists "Critics edit until voting opens" on public.reviews;
create policy "Critics edit until voting opens"
  on public.reviews for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.screening_phase(festival_id, tmdb_id) in ('VIEWING', 'REVIEWING')
  )
  with check (user_id = (select auth.uid()));

drop policy if exists "Members delete own reviews" on public.reviews;
drop policy if exists "Critics delete until voting opens" on public.reviews;
create policy "Critics delete until voting opens"
  on public.reviews for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.screening_phase(festival_id, tmdb_id) in ('VIEWING', 'REVIEWING')
  );

-- A review filed after the review period closes cannot be voted on.
create or replace function public.mark_review_eligibility()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.eligible :=
    public.screening_phase(new.festival_id, new.tmdb_id) in ('VIEWING', 'REVIEWING');
  return new;
end;
$$;

drop trigger if exists review_eligibility on public.reviews;
create trigger review_eligibility
  before insert on public.reviews
  for each row execute procedure public.mark_review_eligibility();

/**
 * The review thread for one film.
 *
 * Authorship is withheld until the film's voting window shuts — the whole
 * point of anonymity is that people upvote the writing, not the writer. Vote
 * counts are withheld for the same reason and appear at the same moment.
 */
drop function if exists public.film_reviews(uuid, int);
create function public.film_reviews(fid uuid, tid int)
returns table (
  id uuid,
  user_id uuid,
  body text,
  eligible boolean,
  created_at timestamptz,
  upvotes bigint,
  upvoted_by_me boolean,
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
              then (select count(*) from public.review_votes v where v.review_id = r.id)
              else 0::bigint end,
         exists (
           select 1 from public.review_votes v
           where v.review_id = r.id and v.user_id = (select auth.uid())
         ),
         -- Stated outright rather than left for the client to infer: before
         -- the reveal there is no user_id to compare against, and matching on
         -- body text would mislabel two people who wrote the same thing.
         r.user_id = (select auth.uid()),
         public.screening_phase(fid, tid) = 'CLOSED'
  from public.reviews r
  where r.festival_id = fid
    and r.tmdb_id = tid
    and public.is_guild_member(public.festival_guild(fid))
    -- The thread opens when voting does. Reading other people's write-ups
    -- while you are still writing your own is exactly the bias anonymity is
    -- meant to remove.
    and public.screening_phase(fid, tid) in ('CRITICS_VOTING', 'CLOSED')
  order by r.created_at;
$$;

-- ── 9. Upvotes: exactly three per critic per film ───────────────────────────
create or replace function public.review_guild(rid uuid)
returns uuid language sql stable security definer set search_path = ''
as $$
  select f.guild_id
  from public.reviews r
  join public.festivals f on f.id = r.festival_id
  where r.id = rid;
$$;

-- Upvotes are only accepted while the film's voting window is open, only on
-- eligible reviews, and only three deep.
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

  select count(*) into spent
  from public.review_votes v
  join public.reviews rr on rr.id = v.review_id
  where v.user_id = new.user_id
    and rr.festival_id = r.festival_id
    and rr.tmdb_id = r.tmdb_id;

  if spent >= 3 then
    raise exception 'You have already spent all three upvotes on this film';
  end if;

  return new;
end;
$$;

drop trigger if exists upvote_rules on public.review_votes;
create trigger upvote_rules
  before insert on public.review_votes
  for each row execute procedure public.enforce_upvote_rules();

-- Upvotes may be moved around while the window is open, never after it shuts.
drop policy if exists "review_votes delete own" on public.review_votes;
create policy "review_votes delete own"
  on public.review_votes for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.reviews r
      where r.id = review_id
        and public.screening_phase(r.festival_id, r.tmdb_id) = 'CRITICS_VOTING'
    )
  );

/**
 * How many of this critic's three upvotes are still unspent on a film, and
 * whether their own review is therefore still in the running.
 *
 * The rule from the founding notes: you must spend all three, or your own
 * review stops being eligible to receive any.
 */
drop function if exists public.my_upvote_budget(uuid, int);
create function public.my_upvote_budget(fid uuid, tid int)
returns table (spent int, remaining int, own_review_at_risk boolean)
language sql stable security definer set search_path = ''
as $$
  with s as (
    select count(*)::int as n
    from public.review_votes v
    join public.reviews r on r.id = v.review_id
    where v.user_id = (select auth.uid())
      and r.festival_id = fid and r.tmdb_id = tid
  )
  select s.n,
         greatest(0, 3 - s.n),
         s.n < 3 and exists (
           select 1 from public.reviews r
           where r.festival_id = fid and r.tmdb_id = tid
             and r.user_id = (select auth.uid())
         )
  from s;
$$;

/**
 * The film's result once its window has shut: the reviews that were in the
 * running, ranked, with the authors revealed.
 *
 * A review only counts if its author spent all three of their own upvotes —
 * that is the participation rule, applied at the moment it matters.
 */
drop function if exists public.film_review_results(uuid, int);
create function public.film_review_results(fid uuid, tid int)
returns table (review_id uuid, user_id uuid, body text, upvotes bigint)
language sql stable security definer set search_path = ''
as $$
  select r.id,
         r.user_id,
         r.body,
         (select count(*) from public.review_votes v where v.review_id = r.id)
  from public.reviews r
  where r.festival_id = fid
    and r.tmdb_id = tid
    and r.eligible
    and public.screening_phase(fid, tid) = 'CLOSED'
    and public.is_guild_member(public.festival_guild(fid))
    and (
      select count(*) from public.review_votes v
      join public.reviews rr on rr.id = v.review_id
      where v.user_id = r.user_id and rr.festival_id = fid and rr.tmdb_id = tid
    ) >= 3
  order by 4 desc, r.created_at;
$$;

/**
 * The Voice of the People standings: upvotes earned across the whole festival.
 *
 * Curators compete alongside everyone else — every curator is a critic too,
 * and the award goes to the best writing regardless of who wrote it.
 */
drop function if exists public.critic_standings(uuid);
create function public.critic_standings(fid uuid)
returns table (user_id uuid, upvotes bigint, reviews_written bigint)
language sql stable security definer set search_path = ''
as $$
  select r.user_id,
         count(v.review_id),
         count(distinct r.id)
  from public.reviews r
  left join public.review_votes v on v.review_id = r.id
  where r.festival_id = fid
    and r.eligible
    and public.is_guild_member(public.festival_guild(fid))
    and (
      select count(*) from public.review_votes vv
      join public.reviews rr on rr.id = vv.review_id
      where vv.user_id = r.user_id
        and rr.festival_id = fid and rr.tmdb_id = r.tmdb_id
    ) >= 3
  group by r.user_id
  order by 2 desc, 3 desc;
$$;

-- ── 10. Awards voting and the ceremony ──────────────────────────────────────
drop policy if exists "Members vote during VOTING" on public.votes;
drop policy if exists "Members vote during AWARDS_VOTING" on public.votes;
create policy "Members vote during AWARDS_VOTING"
  on public.votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.festival_guild(festival_id))
    and public.festival_state(festival_id) = 'AWARDS_VOTING'
  );

drop policy if exists "Members revise votes during VOTING" on public.votes;
drop policy if exists "Members revise votes during AWARDS_VOTING" on public.votes;
create policy "Members revise votes during AWARDS_VOTING"
  on public.votes for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.festival_state(festival_id) = 'AWARDS_VOTING'
  )
  with check (user_id = (select auth.uid()));

drop policy if exists "Members withdraw votes during VOTING" on public.votes;
drop policy if exists "Members withdraw votes during AWARDS_VOTING" on public.votes;
create policy "Members withdraw votes during AWARDS_VOTING"
  on public.votes for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.festival_state(festival_id) = 'AWARDS_VOTING'
  );

-- The winning curator, recorded at publish time so the ceremony reads cleanly.
alter table public.award_results
  add column if not exists curator_id uuid references auth.users (id) on delete set null;

/**
 * The president's release valve. Computes winners from the ballots and flips
 * the festival to CEREMONY atomically; there is no path to edit the outcome.
 *
 * Ties break toward the film whose curator has won least this festival, then
 * lower tmdb_id for determinism — a coin toss that at least spreads the credit.
 */
create or replace function public.publish_festival(fid uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare award record;
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can publish';
  end if;
  if public.festival_state(fid) <> 'AWARDS_VOTING' then
    raise exception 'Festival is not in awards voting';
  end if;

  for award in
    select fa.award_id from public.festival_awards fa where fa.festival_id = fid
  loop
    insert into public.award_results
      (festival_id, award_id, tmdb_id, votes, total_votes, curator_id)
    select fid,
           award.award_id,
           v.tmdb_id,
           count(*)::int,
           (select count(*) from public.votes
             where festival_id = fid and award_id = award.award_id)::int,
           (select l.curator_id from public.lineup_films l
             where l.festival_id = fid and l.tmdb_id = v.tmdb_id)
    from public.votes v
    where v.festival_id = fid and v.award_id = award.award_id
    group by v.tmdb_id
    order by count(*) desc, v.tmdb_id asc
    limit 1
    on conflict (festival_id, award_id) do nothing;
  end loop;

  update public.festivals set state = 'CEREMONY' where id = fid;
end;
$$;

-- Legacy name, kept so any older call site still resolves.
create or replace function public.publish_season(sid uuid)
returns void language plpgsql security definer set search_path = ''
as $$ begin perform public.publish_festival(sid); end; $$;

-- ── 11. Joining: critics walk in, curators apply ────────────────────────────
drop function if exists public.guild_preview(text);
create function public.guild_preview(code text)
returns table (
  id uuid,
  name text,
  curator_count bigint,
  critic_count bigint,
  max_curators int,
  max_critics int
)
language sql stable security definer set search_path = ''
as $$
  select g.id,
         g.name,
         count(*) filter (
           where m.role in ('president', 'curator') and m.status = 'active'
         ),
         count(*) filter (where m.role = 'critic' and m.status = 'active'),
         g.max_curators,
         g.max_critics
  from public.guilds g
  left join public.guild_members m on m.guild_id = g.id
  where g.invite_code = code
  group by g.id, g.name, g.max_curators, g.max_critics;
$$;

/**
 * Invite code → membership.
 *
 * Critics are admitted straight away; there is no reason to gatekeep the
 * voting body. Curators land as `pending` and wait for the president, because
 * a curator seat is one of only twelve and it costs someone else theirs.
 */
drop function if exists public.join_guild(text);
drop function if exists public.join_guild(text, boolean);
create function public.join_guild(code text, as_curator boolean default false)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare gid uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Must be signed in to join a guild';
  end if;

  select id into gid from public.guilds where invite_code = code;
  if gid is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.guild_members (guild_id, user_id, role, status)
  values (
    gid,
    (select auth.uid()),
    case when as_curator then 'curator' else 'critic' end,
    case when as_curator then 'pending' else 'active' end
  )
  on conflict (guild_id, user_id) do nothing;

  return gid;
end;
$$;

/** The president's approval queue. Promotion runs through the cap trigger. */
create or replace function public.approve_curator(gid uuid, uid uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_guild_president(gid) then
    raise exception 'Only the guild president can approve curators';
  end if;

  update public.guild_members
     set role = 'curator', status = 'active'
   where guild_id = gid and user_id = uid and status = 'pending';
end;
$$;

/** Turned down, or stepping back: either way they stay on as a critic. */
create or replace function public.decline_curator(gid uuid, uid uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_guild_president(gid) then
    raise exception 'Only the guild president can decline curators';
  end if;

  update public.guild_members
     set role = 'critic', status = 'active'
   where guild_id = gid and user_id = uid and status = 'pending';
end;
$$;
