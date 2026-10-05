-- Web-first data model. Every row belongs to one AIMaster member.
create table if not exists public.tco_threads_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  threads_user_id text not null,
  username text,
  access_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, threads_user_id)
);

create table if not exists public.tco_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.tco_threads_accounts(id) on delete cascade,
  body text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','publishing','published','failed','cancelled')),
  scheduled_at timestamptz,
  published_at timestamptz,
  threads_post_id text,
  permalink text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tco_threads_accounts_user_id_idx on public.tco_threads_accounts(user_id);
create index if not exists tco_posts_user_id_status_idx on public.tco_posts(user_id, status, scheduled_at);

alter table public.tco_threads_accounts enable row level security;
alter table public.tco_posts enable row level security;

drop policy if exists "tco_accounts_owner_only" on public.tco_threads_accounts;
create policy "tco_accounts_owner_only" on public.tco_threads_accounts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tco_posts_owner_only" on public.tco_posts;
create policy "tco_posts_owner_only" on public.tco_posts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
