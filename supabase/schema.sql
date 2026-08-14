-- Couch Cinema Collective — auth schema.
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query),
-- or via `supabase db push` if you adopt the CLI later.

-- ── Profiles ────────────────────────────────────────────────────────────────
-- One row per auth user. auth.users is Supabase-managed and not directly
-- queryable from the client, so app-facing member data lives here.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Members of a film club see each other; keep reads open to signed-in users.
create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert/delete policies: rows are created by the trigger below and
-- removed by the auth.users cascade.

-- ── Auto-create a profile on signup ─────────────────────────────────────────
-- Email signups stash full_name/phone in raw_user_meta_data (see the signup
-- server action); Google/Facebook provide name/picture under their own keys.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Keep updated_at honest ──────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
