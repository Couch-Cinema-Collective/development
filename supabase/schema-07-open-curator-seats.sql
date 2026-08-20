-- Couch Cinema Collective — curator seats are open, not approved.
-- Run AFTER schema-06-festivals.sql, in the Supabase SQL Editor. Idempotent.
--
-- The approval queue is gone. A curator seat is now first-come-first-served:
-- anyone with the invite code takes one if the guild has a free seat, and the
-- president controls scarcity by setting how many seats exist rather than by
-- ruling on applicants one at a time.
--
-- That removes the `pending` membership state entirely, so the status column
-- goes with it — every row in guild_members is now, by construction, an
-- active member.

set check_function_bodies = off;

-- ── 1. Seat anyone still waiting, then drop the concept ─────────────────────
-- Pending curators are admitted in the order they applied, up to the cap.
-- Anyone who doesn't fit stays on as a critic rather than being dropped.
do $$
declare r record; seats int; taken int;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'guild_members'
      and column_name = 'status'
  ) then
    return;
  end if;

  for r in
    select gm.guild_id, gm.user_id, gm.joined_at, g.max_curators
    from public.guild_members gm
    join public.guilds g on g.id = gm.guild_id
    where gm.status = 'pending'
    order by gm.guild_id, gm.joined_at
  loop
    select count(*) into taken
    from public.guild_members
    where guild_id = r.guild_id
      and role in ('president', 'curator')
      and status = 'active';

    seats := r.max_curators - taken;

    update public.guild_members
       set role = case when seats > 0 then 'curator' else 'critic' end,
           status = 'active'
     where guild_id = r.guild_id and user_id = r.user_id;
  end loop;
end $$;

alter table public.guild_members drop constraint if exists guild_members_status_check;
alter table public.guild_members drop column if exists status;

-- ── 2. Membership helpers, without the status filter ────────────────────────
create or replace function public.is_guild_member(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = gid and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_guild_president(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = gid
      and user_id = (select auth.uid())
      and role = 'president'
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
  );
$$;

-- Applicants no longer exist, so the roster is members-only again.
drop policy if exists "Members can see the roster" on public.guild_members;
create policy "Members can see the roster"
  on public.guild_members for select to authenticated
  using (public.is_guild_member(guild_id));

-- ── 3. Caps, counted without status ─────────────────────────────────────────
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
    where guild_id = new.guild_id and role in ('president', 'curator');
    if n >= curator_cap then
      raise exception 'Every curator seat is taken (% of %)', n, curator_cap
        using errcode = 'check_violation';
    end if;
  else
    select count(*) into n from public.guild_members
    where guild_id = new.guild_id and role = 'critic';
    if n >= critic_cap then
      raise exception 'Every critic seat is taken (% of %)', n, critic_cap
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- A critic moving up to curator has to fit the same cap as a fresh join.
create or replace function public.enforce_guild_cap_on_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare curator_cap int; n int;
begin
  if new.role in ('president', 'curator')
     and old.role not in ('president', 'curator') then
    select max_curators into curator_cap from public.guilds where id = new.guild_id;
    select count(*) into n from public.guild_members
    where guild_id = new.guild_id
      and role in ('president', 'curator')
      and user_id <> new.user_id;
    if n >= curator_cap then
      raise exception 'Every curator seat is taken (% of %)', n, curator_cap
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

-- The creator becomes president, and takes the first curator seat with it.
create or replace function public.handle_new_guild()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.guild_members (guild_id, user_id, role)
  values (new.id, new.created_by, 'president');
  return new;
end;
$$;

-- ── 4. Joining: take a seat if one is free ──────────────────────────────────
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
         count(*) filter (where m.role in ('president', 'curator')),
         count(*) filter (where m.role = 'critic'),
         g.max_curators,
         g.max_critics
  from public.guilds g
  left join public.guild_members m on m.guild_id = g.id
  where g.invite_code = code
  group by g.id, g.name, g.max_curators, g.max_critics;
$$;

/**
 * Invite code → membership, seat taken on arrival.
 *
 * Curator seats are first-come-first-served: there is no approval step, so
 * the only thing standing between someone and a seat is whether one is left.
 * Running out is a plain error rather than a silent downgrade to critic —
 * being quietly given a different job than the one you asked for is worse
 * than being told the room is full.
 *
 * Re-joining is a no-op, and an existing critic asking for a curator seat is
 * promoted into a free one.
 */
drop function if exists public.join_guild(text);
drop function if exists public.join_guild(text, boolean);
create function public.join_guild(code text, as_curator boolean default false)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  gid uuid;
  uid uuid := (select auth.uid());
  current_role_name text;
  taken int;
  cap int;
begin
  if uid is null then
    raise exception 'Must be signed in to join a guild';
  end if;

  select id into gid from public.guilds where invite_code = code;
  if gid is null then
    raise exception 'Invalid invite code';
  end if;

  select role into current_role_name
  from public.guild_members where guild_id = gid and user_id = uid;

  -- Already a curator (or the president): nothing to do either way.
  if current_role_name in ('president', 'curator') then
    return gid;
  end if;

  if as_curator then
    select count(*), max(g.max_curators) into taken, cap
    from public.guild_members m
    join public.guilds g on g.id = m.guild_id
    where m.guild_id = gid and m.role in ('president', 'curator');

    if taken >= cap then
      raise exception
        'Every curator seat is taken (% of %). You can still join as a critic.',
        taken, cap
        using errcode = 'check_violation';
    end if;

    if current_role_name = 'critic' then
      update public.guild_members set role = 'curator'
       where guild_id = gid and user_id = uid;
    else
      insert into public.guild_members (guild_id, user_id, role)
      values (gid, uid, 'curator');
    end if;

    return gid;
  end if;

  insert into public.guild_members (guild_id, user_id, role)
  values (gid, uid, 'critic')
  on conflict (guild_id, user_id) do nothing;

  return gid;
end;
$$;

-- The approval queue no longer exists.
drop function if exists public.approve_curator(uuid, uuid);
drop function if exists public.decline_curator(uuid, uuid);

-- ── 5. The president sets how many seats there are ──────────────────────────
/**
 * Scarcity is now the president's only lever over the curator roster, so it
 * gets a proper entry point rather than a bare column update: the floor is
 * however many curators are already seated, because taking a seat away from
 * someone who has already filed a nomination is not a settings change.
 */
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

-- ── 6. Counts, without status ───────────────────────────────────────────────
drop function if exists public.nomination_count(uuid);
create function public.nomination_count(fid uuid)
returns table (submitted bigint, expected bigint)
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from public.nominations where festival_id = fid),
         (select count(*) from public.guild_members
           where guild_id = public.festival_guild(fid)
             and role in ('president', 'curator'))
  where public.is_guild_member(public.festival_guild(fid));
$$;
