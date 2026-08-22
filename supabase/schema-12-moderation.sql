-- Couch Cinema Collective — content moderation: review flags, member blocks,
-- president takedowns. Reviews are the app's user-generated content, so App
-- Store guideline 1.2 requires a way to report them and block their authors.
-- Idempotent: safe to re-run. Apply after schema-11-unstick-unopened.sql.

-- ---------------------------------------------------------------------------
-- 0. review_guild() was written for the season model (reviews.season_id,
--    public.seasons) and was never updated for the festival rename, so every
--    policy that calls it — review upvotes included — errors at runtime.
--    Redefining it repairs them all in place.
-- ---------------------------------------------------------------------------
create or replace function public.review_guild(rid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select public.festival_guild(r.festival_id)
  from public.reviews r
  where r.id = rid;
$$;

-- ---------------------------------------------------------------------------
-- 1. Review reports. Any guild member can flag a review — anonymity holds,
--    since a flag needs only the review id, never the author. Flags land in
--    the president's queue on the guild page. One flag per member per review.
-- ---------------------------------------------------------------------------
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

alter table public.review_reports enable row level security;

drop policy if exists "Members report guild reviews" on public.review_reports;
create policy "Members report guild reviews"
  on public.review_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and public.is_guild_member(public.review_guild(review_id))
  );

-- Reporters see their own flags (so the button can say "reported");
-- presidents see the whole queue.
drop policy if exists "Reporter and commissioner read reports" on public.review_reports;
drop policy if exists "Reporter and president read reports" on public.review_reports;
create policy "Reporter and president read reports"
  on public.review_reports for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.is_guild_president(public.review_guild(review_id))
  );

-- Dismissing a flag deletes it; removing the review cascades the rest away.
drop policy if exists "Commissioners clear reports" on public.review_reports;
drop policy if exists "Presidents clear reports" on public.review_reports;
create policy "Presidents clear reports"
  on public.review_reports for delete to authenticated
  using (public.is_guild_president(public.review_guild(review_id)));

create index if not exists review_reports_review_idx
  on public.review_reports (review_id);

-- ---------------------------------------------------------------------------
-- 2. President takedowns. Critics can already delete their own reviews while
--    the window is open; the president can remove anyone's, any time.
--    Upvotes and flags cascade with the row.
-- ---------------------------------------------------------------------------
drop policy if exists "Commissioners remove guild reviews" on public.reviews;
drop policy if exists "Presidents remove guild reviews" on public.reviews;
create policy "Presidents remove guild reviews"
  on public.reviews for delete to authenticated
  using (public.is_guild_president(public.review_guild(id)));

-- ---------------------------------------------------------------------------
-- 3. Member blocks. Strictly personal: blocking someone hides their revealed
--    reviews from you and nothing else — the blocked member is never told,
--    and no one else's view changes. (While a film's window is open, reviews
--    are anonymous by design, so a block cannot apply until the reveal.)
-- ---------------------------------------------------------------------------
create table if not exists public.member_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.member_blocks enable row level security;

drop policy if exists "Own blocks readable" on public.member_blocks;
create policy "Own blocks readable"
  on public.member_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists "Own blocks insert" on public.member_blocks;
create policy "Own blocks insert"
  on public.member_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists "Own blocks delete" on public.member_blocks;
create policy "Own blocks delete"
  on public.member_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));
