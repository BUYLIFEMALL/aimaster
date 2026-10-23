-- 인스타그램 자동 포스팅 관리 웹 - AI 게시글 주제 후보 저장
-- HTTP/RSS/Perplexity 방식으로 수집한 인스타그램 게시글 주제 후보를 저장합니다.
-- Supabase 대시보드 SQL Editor 또는 `supabase db push`로 실행하세요.

create table if not exists public.insta_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('http', 'rss', 'perplexity')),
  source_input text not null,
  title text not null,
  caption text not null,
  hashtags text[] not null default '{}',
  keywords text[] not null default '{}',
  status text not null default 'collected' check (status in ('collected', 'used')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger insta_candidates_set_updated_at
  before update on public.insta_candidates
  for each row execute function public.set_updated_at();

create index if not exists insta_candidates_user_created_idx
  on public.insta_candidates (user_id, created_at desc);

alter table public.insta_candidates enable row level security;

create policy "insta_candidates_select_own"
  on public.insta_candidates for select
  using (auth.uid() = user_id);

create policy "insta_candidates_insert_own"
  on public.insta_candidates for insert
  with check (auth.uid() = user_id);

create policy "insta_candidates_update_own"
  on public.insta_candidates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "insta_candidates_delete_own"
  on public.insta_candidates for delete
  using (auth.uid() = user_id);
