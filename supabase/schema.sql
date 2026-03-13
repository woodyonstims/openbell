-- OpenBell database schema
-- Run this in your Supabase SQL editor to set up all tables and RLS policies

-- ─────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────

-- uuid_generate_v4() used for default PKs
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- watchlist
-- Stores which tickers each user is watching
-- ─────────────────────────────────────────────

create table if not exists public.watchlist (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  ticker     text not null,
  added_at   timestamptz not null default now(),
  -- A user can only add a ticker once
  unique(user_id, ticker)
);

-- Enable row-level security — no one can read/write without a policy
alter table public.watchlist enable row level security;

-- Users can only see their own watchlist rows
create policy "watchlist: select own"
  on public.watchlist for select
  using (auth.uid() = user_id);

-- Users can only insert rows for themselves
create policy "watchlist: insert own"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own rows
create policy "watchlist: delete own"
  on public.watchlist for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- portfolio
-- Stores stock positions (shares + cost basis) per user
-- ─────────────────────────────────────────────

create table if not exists public.portfolio (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  ticker      text not null,
  shares      numeric not null check (shares > 0),
  avg_price   numeric not null check (avg_price >= 0),
  added_at    timestamptz not null default now()
);

alter table public.portfolio enable row level security;

create policy "portfolio: select own"
  on public.portfolio for select
  using (auth.uid() = user_id);

create policy "portfolio: insert own"
  on public.portfolio for insert
  with check (auth.uid() = user_id);

create policy "portfolio: delete own"
  on public.portfolio for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- alerts
-- Price alerts — trigger when price crosses a target
-- ─────────────────────────────────────────────

create table if not exists public.alerts (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  ticker         text not null,
  target_price   numeric not null,
  -- direction must be 'above' or 'below'
  direction      text not null check (direction in ('above', 'below')),
  is_triggered   boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table public.alerts enable row level security;

create policy "alerts: select own"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "alerts: insert own"
  on public.alerts for insert
  with check (auth.uid() = user_id);

create policy "alerts: update own"
  on public.alerts for update
  using (auth.uid() = user_id);

create policy "alerts: delete own"
  on public.alerts for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- posts
-- Community discussion posts
-- ─────────────────────────────────────────────

create table if not exists public.posts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  -- Optional ticker tag (e.g. 'AAPL') — null if post is general
  ticker      text,
  created_at  timestamptz not null default now()
);

alter table public.posts enable row level security;

-- Anyone logged in can read posts
create policy "posts: select all"
  on public.posts for select
  using (true);

-- Users can only create posts as themselves
create policy "posts: insert own"
  on public.posts for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own posts
create policy "posts: delete own"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- post_likes
-- Tracks which users liked which posts
-- ─────────────────────────────────────────────

create table if not exists public.post_likes (
  post_id   uuid not null references public.posts(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  -- Composite PK — one like per user per post
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

-- Anyone logged in can see all likes (needed for like counts)
create policy "post_likes: select all"
  on public.post_likes for select
  using (true);

-- Users can only add their own likes
create policy "post_likes: insert own"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

-- Users can only remove their own likes
create policy "post_likes: delete own"
  on public.post_likes for delete
  using (auth.uid() = user_id);
