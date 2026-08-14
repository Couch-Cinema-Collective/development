-- Couch Cinema Collective — domain schema (guilds, seasons, nominations, votes).
-- Run AFTER schema.sql, in the Supabase SQL Editor. Idempotent: safe to re-run.
--
-- Rules encoded here rather than trusted to the app (PLAN.md references):
--   §1.1  5 nomination points per member, hidden-until-lock
--   §1.6  50-member guild cap
--   §2    commissioner sees results before publishing but CANNOT alter them
--
-- Postgres has no auto-updatable "who nominated what" privacy — it's done with
-- RLS + a security-definer aggregate (nomination_pool) that returns totals
-- without identities.

-- The helper functions below reference tables defined later in this file;
-- skip body validation at create time (bodies still validate on first call).
set check_function_bodies = off;

-- ── Role/membership helpers ─────────────────────────────────────────────────
-- security definer so policies on other tables can consult guild_members
-- without tripping over guild_members' own RLS (infinite recursion otherwise).
create or replace function public.is_guild_member(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = gid and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_guild_commissioner(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = gid
      and user_id = (select auth.uid())
      and role = 'commissioner'
  );
$$;

create or replace function public.season_guild(sid uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select guild_id from public.seasons where id = sid;
$$;

create or replace function public.season_state(sid uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select state from public.seasons where id = sid;
$$;

-- ── Guilds ──────────────────────────────────────────────────────────────────
create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  -- Shareable join code; regenerate by updating this column.
  invite_code text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  -- §1.6 — hard cap. 50 is the ceiling, commissioners may set it lower.
  max_members int not null default 50 check (max_members between 2 and 50),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.guilds enable row level security;

drop policy if exists "Members can read their guilds" on public.guilds;
create policy "Members can read their guilds"
  on public.guilds for select to authenticated
  using (public.is_guild_member(id));

drop policy if exists "Any user can create a guild" on public.guilds;
create policy "Any user can create a guild"
  on public.guilds for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Commissioners can update their guild" on public.guilds;
create policy "Commissioners can update their guild"
  on public.guilds for update to authenticated
  using (public.is_guild_commissioner(id))
  with check (public.is_guild_commissioner(id));

-- ── Guild members (the role model) ──────────────────────────────────────────
create table if not exists public.guild_members (
  guild_id uuid not null references public.guilds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('commissioner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (guild_id, user_id)
);

alter table public.guild_members enable row level security;

drop policy if exists "Members can see the roster" on public.guild_members;
create policy "Members can see the roster"
  on public.guild_members for select to authenticated
  using (public.is_guild_member(guild_id));

-- No insert policy on purpose: rows are created only by the guild-creation
-- trigger and the join_guild() RPC below, both security definer.

drop policy if exists "Members can leave; commissioners can remove" on public.guild_members;
create policy "Members can leave; commissioners can remove"
  on public.guild_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_guild_commissioner(guild_id)
  );

drop policy if exists "Commissioners can change roles" on public.guild_members;
create policy "Commissioners can change roles"
  on public.guild_members for update to authenticated
  using (public.is_guild_commissioner(guild_id))
  with check (public.is_guild_commissioner(guild_id));

-- Creator becomes commissioner automatically.
create or replace function public.handle_new_guild()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.guild_members (guild_id, user_id, role)
  values (new.id, new.created_by, 'commissioner');
  return new;
end;
$$;

drop trigger if exists on_guild_created on public.guilds;
create trigger on_guild_created
  after insert on public.guilds
  for each row execute procedure public.handle_new_guild();

-- §1.6 — enforce the cap at the door.
create or replace function public.enforce_guild_cap()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare cap int;
begin
  select max_members into cap from public.guilds where id = new.guild_id;
  if (select count(*) from public.guild_members where guild_id = new.guild_id) >= cap then
    raise exception 'Guild is at capacity (% members)', cap;
  end if;
  return new;
end;
$$;

drop trigger if exists guild_cap_check on public.guild_members;
create trigger guild_cap_check
  before insert on public.guild_members
  for each row execute procedure public.enforce_guild_cap();

-- ── Seasons ─────────────────────────────────────────────────────────────────
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  number int not null check (number >= 1),
  title text not null default '',
  -- e.g. "Animation", "French New Wave"
  category text not null default '',
  -- §2 — the season state machine. Transitions are app logic; PUBLISHED is
  -- reachable only via publish_season() below.
  state text not null default 'DRAFT' check (state in (
    'DRAFT', 'NOMINATING', 'TALLYING', 'SLATE_LOCKED',
    'WATCHING', 'VOTING', 'PUBLISHED', 'ARCHIVED'
  )),
  -- Target slate size; ties expand it (§1.7), so slate_films may hold more.
  film_count int not null default 6 check (film_count between 1 and 30),
  nomination_deadline timestamptz,
  -- §1.2 — the two commissioner sliders.
  w_guild numeric not null default 0.8,
  w_critic numeric not null default 0.2,
  -- §1.5 — voting eligibility. 'trakt' is phase 2 but valid from day one.
  eligibility text not null default 'honor'
    check (eligibility in ('honor', 'open', 'trakt')),
  created_at timestamptz not null default now(),
  unique (guild_id, number),
  check (abs(w_guild + w_critic - 1.0) < 0.001)
);

alter table public.seasons enable row level security;

drop policy if exists "Members can read seasons" on public.seasons;
create policy "Members can read seasons"
  on public.seasons for select to authenticated
  using (public.is_guild_member(guild_id));

drop policy if exists "Commissioners manage seasons" on public.seasons;
create policy "Commissioners manage seasons"
  on public.seasons for insert to authenticated
  with check (public.is_guild_commissioner(guild_id));

drop policy if exists "Commissioners update seasons" on public.seasons;
create policy "Commissioners update seasons"
  on public.seasons for update to authenticated
  using (public.is_guild_commissioner(guild_id))
  with check (
    public.is_guild_commissioner(guild_id)
    -- §2 — PUBLISHED can only be reached through publish_season().
    and state <> 'PUBLISHED'
  );

-- ── Season awards (max 15, Best Picture locked on — enforced in app) ────────
create table if not exists public.season_awards (
  season_id uuid not null references public.seasons (id) on delete cascade,
  -- Catalog slug ("picture", "editing") or "custom-…" for guild-made awards.
  award_id text not null,
  name text not null,
  tier text not null check (tier in (
    'craft', 'writing', 'custom', 'performance', 'direction', 'picture'
  )),
  primary key (season_id, award_id)
);

alter table public.season_awards enable row level security;

drop policy if exists "Members can read season awards" on public.season_awards;
create policy "Members can read season awards"
  on public.season_awards for select to authenticated
  using (public.is_guild_member(public.season_guild(season_id)));

drop policy if exists "Commissioners manage season awards" on public.season_awards;
create policy "Commissioners manage season awards"
  on public.season_awards for all to authenticated
  using (public.is_guild_commissioner(public.season_guild(season_id)))
  with check (public.is_guild_commissioner(public.season_guild(season_id)));

-- ── Nominations (§1.1) ──────────────────────────────────────────────────────
create table if not exists public.nominations (
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id int not null,
  points int not null check (points between 1 and 5),
  -- Display snapshot ({title, year, posterPath, director…}) so the pool
  -- renders without a TMDB round-trip per row.
  film jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (season_id, user_id, tmdb_id)
);

alter table public.nominations enable row level security;

-- §1.1 — who nominated what stays hidden until slate lock. Members always see
-- their own stakes; everyone else's appear once the season passes TALLYING.
drop policy if exists "Own always; others after lock" on public.nominations;
create policy "Own always; others after lock"
  on public.nominations for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      public.is_guild_member(public.season_guild(season_id))
      and public.season_state(season_id) in
        ('SLATE_LOCKED', 'WATCHING', 'VOTING', 'PUBLISHED', 'ARCHIVED')
    )
  );

drop policy if exists "Members nominate during NOMINATING" on public.nominations;
create policy "Members nominate during NOMINATING"
  on public.nominations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.season_guild(season_id))
    and public.season_state(season_id) = 'NOMINATING'
  );

drop policy if exists "Members restake during NOMINATING" on public.nominations;
create policy "Members restake during NOMINATING"
  on public.nominations for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.season_state(season_id) = 'NOMINATING'
  )
  with check (user_id = (select auth.uid()));

drop policy if exists "Members withdraw during NOMINATING" on public.nominations;
create policy "Members withdraw during NOMINATING"
  on public.nominations for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.season_state(season_id) = 'NOMINATING'
  );

-- §1.1 — the 5-point budget, enforced where it can't be dodged.
create or replace function public.enforce_point_budget()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare total int;
begin
  select coalesce(sum(points), 0) into total
  from public.nominations
  where season_id = new.season_id and user_id = new.user_id;
  if total > 5 then
    raise exception 'Nomination budget exceeded: % of 5 points', total;
  end if;
  return new;
end;
$$;

drop trigger if exists nomination_budget_check on public.nominations;
create constraint trigger nomination_budget_check
  after insert or update on public.nominations
  for each row execute procedure public.enforce_point_budget();

-- The live pool during NOMINATING: totals per film, identities withheld.
create or replace function public.nomination_pool(sid uuid)
returns table (tmdb_id int, film jsonb, total_points bigint, nominator_count bigint)
language sql stable security definer set search_path = ''
as $$
  select n.tmdb_id,
         (array_agg(n.film order by n.created_at))[1] as film,
         sum(n.points) as total_points,
         count(distinct n.user_id) as nominator_count
  from public.nominations n
  where n.season_id = sid
    and public.is_guild_member(public.season_guild(sid))
  group by n.tmdb_id
  order by total_points desc;
$$;

-- ── The locked slate ────────────────────────────────────────────────────────
create table if not exists public.slate_films (
  season_id uuid not null references public.seasons (id) on delete cascade,
  tmdb_id int not null,
  -- Full snapshot at lock time, external scores included (§3.2).
  film jsonb not null default '{}'::jsonb,
  primary key (season_id, tmdb_id)
);

alter table public.slate_films enable row level security;

drop policy if exists "Members can read the slate" on public.slate_films;
create policy "Members can read the slate"
  on public.slate_films for select to authenticated
  using (public.is_guild_member(public.season_guild(season_id)));

drop policy if exists "Commissioners set the slate" on public.slate_films;
create policy "Commissioners set the slate"
  on public.slate_films for all to authenticated
  using (public.is_guild_commissioner(public.season_guild(season_id)))
  with check (public.is_guild_commissioner(public.season_guild(season_id)));

-- ── Watch records (§1.5 — what unlocks the ballot) ──────────────────────────
create table if not exists public.watch_records (
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id int not null,
  watched_at timestamptz not null default now(),
  primary key (season_id, user_id, tmdb_id)
);

alter table public.watch_records enable row level security;

drop policy if exists "Members see guild watch progress" on public.watch_records;
create policy "Members see guild watch progress"
  on public.watch_records for select to authenticated
  using (public.is_guild_member(public.season_guild(season_id)));

drop policy if exists "Members track own watching" on public.watch_records;
create policy "Members track own watching"
  on public.watch_records for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.season_guild(season_id))
  );

drop policy if exists "Members untrack own watching" on public.watch_records;
create policy "Members untrack own watching"
  on public.watch_records for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── Reviews (WATCHING phase write-ups) ──────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id int not null,
  -- Out of 5 in half-steps, separate from critic scores.
  rating numeric not null check (rating between 0.5 and 5 and mod(rating * 2, 1) = 0),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (season_id, user_id, tmdb_id)
);

alter table public.reviews enable row level security;

drop policy if exists "Members read guild reviews" on public.reviews;
create policy "Members read guild reviews"
  on public.reviews for select to authenticated
  using (public.is_guild_member(public.season_guild(season_id)));

drop policy if exists "Members write own reviews" on public.reviews;
create policy "Members write own reviews"
  on public.reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.season_guild(season_id))
  );

drop policy if exists "Members edit own reviews" on public.reviews;
create policy "Members edit own reviews"
  on public.reviews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Members delete own reviews" on public.reviews;
create policy "Members delete own reviews"
  on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── Votes ───────────────────────────────────────────────────────────────────
-- Ballots are secret: readable only by their owner, ever. Results come out
-- through publish_season(), which aggregates without exposing individuals.
create table if not exists public.votes (
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  award_id text not null,
  tmdb_id int not null,
  created_at timestamptz not null default now(),
  primary key (season_id, user_id, award_id)
);

alter table public.votes enable row level security;

drop policy if exists "Voters read own ballot" on public.votes;
create policy "Voters read own ballot"
  on public.votes for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Members vote during VOTING" on public.votes;
create policy "Members vote during VOTING"
  on public.votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.season_guild(season_id))
    and public.season_state(season_id) = 'VOTING'
  );

drop policy if exists "Members revise votes during VOTING" on public.votes;
create policy "Members revise votes during VOTING"
  on public.votes for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.season_state(season_id) = 'VOTING'
  )
  with check (user_id = (select auth.uid()));

drop policy if exists "Members withdraw votes during VOTING" on public.votes;
create policy "Members withdraw votes during VOTING"
  on public.votes for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.season_state(season_id) = 'VOTING'
  );

-- ── Award results (§2 — write-once, computed, never edited) ─────────────────
create table if not exists public.award_results (
  season_id uuid not null references public.seasons (id) on delete cascade,
  award_id text not null,
  tmdb_id int not null,
  votes int not null,
  total_votes int not null,
  published_at timestamptz not null default now(),
  primary key (season_id, award_id)
);

alter table public.award_results enable row level security;

-- Readable by the guild once they exist. NO insert/update/delete policies:
-- rows are written exclusively by publish_season() (security definer), which
-- is what makes "publish, don't edit" a hard constraint.
drop policy if exists "Members read published results" on public.award_results;
create policy "Members read published results"
  on public.award_results for select to authenticated
  using (public.is_guild_member(public.season_guild(season_id)));

-- ── RPCs ────────────────────────────────────────────────────────────────────

-- Join page, pre-signup: enough to render "You're invited to <guild>".
create or replace function public.guild_preview(code text)
returns table (id uuid, name text, member_count bigint, at_capacity boolean)
language sql stable security definer set search_path = ''
as $$
  select g.id,
         g.name,
         count(m.user_id) as member_count,
         count(m.user_id) >= g.max_members as at_capacity
  from public.guilds g
  left join public.guild_members m on m.guild_id = g.id
  where g.invite_code = code
  group by g.id, g.name, g.max_members;
$$;

-- The player onboarding path: invite code → membership. Cap enforced by the
-- guild_cap_check trigger; re-joining is a no-op.
create or replace function public.join_guild(code text)
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

  insert into public.guild_members (guild_id, user_id, role)
  values (gid, (select auth.uid()), 'member')
  on conflict (guild_id, user_id) do nothing;

  return gid;
end;
$$;

-- §2 — the commissioner's release valve. Computes winners from the ballots
-- and flips the season to PUBLISHED atomically; there is no path to edit the
-- outcome. Vote ties break toward the film with more nomination points (the
-- guild's prior conviction), then lower tmdb_id for determinism.
create or replace function public.publish_season(sid uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare award record;
begin
  if not public.is_guild_commissioner(public.season_guild(sid)) then
    raise exception 'Only the commissioner can publish';
  end if;
  if public.season_state(sid) <> 'VOTING' then
    raise exception 'Season is not in VOTING';
  end if;

  for award in select sa.award_id from public.season_awards sa where sa.season_id = sid
  loop
    insert into public.award_results (season_id, award_id, tmdb_id, votes, total_votes)
    select sid,
           award.award_id,
           v.tmdb_id,
           count(*)::int,
           (select count(*) from public.votes
             where season_id = sid and award_id = award.award_id)::int
    from public.votes v
    where v.season_id = sid and v.award_id = award.award_id
    group by v.tmdb_id
    order by count(*) desc,
             (select coalesce(sum(n.points), 0) from public.nominations n
               where n.season_id = sid and n.tmdb_id = v.tmdb_id) desc,
             v.tmdb_id asc
    limit 1
    on conflict (season_id, award_id) do nothing;
  end loop;

  update public.seasons set state = 'PUBLISHED' where id = sid;
end;
$$;
