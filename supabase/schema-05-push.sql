-- Device tokens for Apple Push Notification service.
-- Idempotent: safe to re-run. Apply after schema-03-social.sql.

create table if not exists public.device_tokens (
  -- The APNs token is the natural key: one row per device, not per sign-in.
  token       text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  platform    text not null default 'ios' check (platform in ('ios', 'android')),
  -- Sandbox tokens are not valid in production and vice versa.
  environment text not null default 'production'
              check (environment in ('production', 'sandbox')),
  updated_at  timestamptz not null default now()
);

alter table public.device_tokens enable row level security;

create index if not exists device_tokens_user_idx
  on public.device_tokens (user_id);

-- A member manages only their own devices. Sending happens server-side with
-- the service role, which bypasses these entirely.
drop policy if exists "device_tokens own" on public.device_tokens;
create policy "device_tokens own"
  on public.device_tokens for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
