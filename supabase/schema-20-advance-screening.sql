-- Couch Cinema Collective — manual phase advancement.
--
-- Three phase boundaries, each with a president-only button that fires once
-- everyone's done their part: watched, reviewed, or submitted their votes.
-- Each button just zeroes out the timestamp that ends the current phase —
-- screening_phase() is derived from these timestamps everywhere else, so
-- nothing else needs to know an advance happened. Only the last one
-- (finalize_voting, which actually closes the film) also carries the time
-- saved into every film still ahead, so a whole festival can be run through
-- in a single day if every window closes early the same way.
-- Idempotent. Apply after schema-19.

-- ── Vote submissions: an explicit "I'm done" a critic clicks, distinct from
--    partial upvote allocation. No update/delete policy — once submitted for
--    a film, it's final, matching the "Submit Upvotes" button being a
--    one-way commit rather than an editable setting.
create table if not exists public.vote_submissions (
  festival_id uuid not null references public.festivals (id) on delete cascade,
  tmdb_id int not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (festival_id, tmdb_id, user_id)
);

alter table public.vote_submissions enable row level security;

drop policy if exists "Members see guild vote-submit progress" on public.vote_submissions;
create policy "Members see guild vote-submit progress"
  on public.vote_submissions for select to authenticated
  using (public.is_guild_member(public.festival_guild(festival_id)));

drop policy if exists "Members submit their own votes" on public.vote_submissions;
create policy "Members submit their own votes"
  on public.vote_submissions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_guild_member(public.festival_guild(festival_id))
  );

-- ── 1. Now Screening -> Review ───────────────────────────────────────────
create or replace function public.advance_to_review(fid uuid, tid int)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can do this';
  end if;
  if public.screening_phase(fid, tid) <> 'VIEWING' then
    raise exception 'This film is not in its viewing window';
  end if;
  if (select count(*) from public.watch_records w
      where w.festival_id = fid and w.tmdb_id = tid) <
     (select count(*) from public.guild_members gm
      where gm.guild_id = public.festival_guild(fid)) then
    raise exception 'Not everyone has watched this film yet';
  end if;

  update public.lineup_films
     set review_starts_at = now()
   where festival_id = fid and tmdb_id = tid;
end;
$$;

grant execute on function public.advance_to_review(uuid, int) to authenticated;

-- ── 2. Review -> Review Voting ───────────────────────────────────────────
create or replace function public.advance_to_voting(fid uuid, tid int)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can do this';
  end if;
  if public.screening_phase(fid, tid) <> 'REVIEWING' then
    raise exception 'This film is not in its review window';
  end if;
  if (select count(distinct r.user_id) from public.reviews r
      where r.festival_id = fid and r.tmdb_id = tid) <
     (select count(*) from public.guild_members gm
      where gm.guild_id = public.festival_guild(fid)) then
    raise exception 'Not everyone has submitted a review yet';
  end if;

  update public.lineup_films
     set voting_starts_at = now()
   where festival_id = fid and tmdb_id = tid;
end;
$$;

grant execute on function public.advance_to_voting(uuid, int) to authenticated;

-- ── 3. Finalize voting: close this film, and carry the film still ahead ──
create or replace function public.finalize_voting(fid uuid, tid int)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  cur_view_start timestamptz;
  old_closes_at  timestamptz;
  shift interval;
begin
  if not public.is_guild_president(public.festival_guild(fid)) then
    raise exception 'Only the guild president can do this';
  end if;
  if public.screening_phase(fid, tid) <> 'CRITICS_VOTING' then
    raise exception 'This film is not in its voting window';
  end if;
  if (select count(*) from public.vote_submissions v
      where v.festival_id = fid and v.tmdb_id = tid) <
     (select count(*) from public.guild_members gm
      where gm.guild_id = public.festival_guild(fid)) then
    raise exception 'Not everyone has submitted their votes yet';
  end if;

  select viewing_starts_at, closes_at into cur_view_start, old_closes_at
    from public.lineup_films
   where festival_id = fid and tmdb_id = tid;

  shift := old_closes_at - now();

  update public.lineup_films
     set closes_at = now()
   where festival_id = fid and tmdb_id = tid;

  -- Matched by its own start, not by position — some rows' stored position
  -- has not always been trustworthy. Only films still ahead of this one
  -- move; each keeps its own window length exactly as scheduled.
  if shift > interval '0' then
    update public.lineup_films
       set viewing_starts_at = viewing_starts_at - shift,
           review_starts_at  = review_starts_at - shift,
           voting_starts_at  = voting_starts_at - shift,
           closes_at         = closes_at - shift
     where festival_id = fid and viewing_starts_at > cur_view_start;
  end if;
end;
$$;

grant execute on function public.finalize_voting(uuid, int) to authenticated;
