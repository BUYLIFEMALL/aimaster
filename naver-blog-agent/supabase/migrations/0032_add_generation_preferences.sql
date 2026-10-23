-- 회원별 기본 글·이미지 생성 모델 설정 (네이버 블로그 에이전트 v1.32)
create table if not exists public.nba_generation_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  text_provider text not null default 'openai',
  text_model text not null default 'gpt-4.1',
  image_model text not null default 'nanobanana-2-2k',
  image_ratio text not null default '1:1',
  image_count integer not null default 2 check (image_count between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nba_generation_preferences enable row level security;

drop policy if exists "Users can read own NBA generation preferences" on public.nba_generation_preferences;
create policy "Users can read own NBA generation preferences"
  on public.nba_generation_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own NBA generation preferences" on public.nba_generation_preferences;
create policy "Users can insert own NBA generation preferences"
  on public.nba_generation_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own NBA generation preferences" on public.nba_generation_preferences;
create policy "Users can update own NBA generation preferences"
  on public.nba_generation_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

update public.programs
set version = 'v1.32', updated_at = now()
where slug = 'naver-blog-agent';
