-- AI 무료음악 자동화 — 회원별 글 AI 설정(2026-11-08 주인님 「설정에서 플랫폼별 모델을 선택 저장」「해당 위치에서는 버튼으로 플랫폼만 선택」
-- 「다른 자동화에 다 구현 되어 있는 기능」). 기준: naver-blog-agent nba_generation_preferences(0032)와 같은 구조·본인만 RLS.
-- text_provider: 앨범 그림 영어 설명 등에 마지막으로 고른 플랫폼(openai | anthropic | gemini)
-- ai_models: 플랫폼별 모델 {"openai": "...", "anthropic": "...", "gemini": "..."} — 곡 만들기 AI 작사·앨범 영어 설명이 함께 씀.
-- 회원 설정이라 30일 자동 삭제 대상이 아니다(생성 콘텐츠 아님). 서버는 서비스 키로 읽고 쓰며 user_id로 거른다.
create table if not exists public.free_music_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  text_provider text not null default 'anthropic' check (text_provider in ('openai', 'anthropic', 'gemini')),
  ai_models jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.free_music_preferences enable row level security;

drop policy if exists "Users can read own free music preferences" on public.free_music_preferences;
create policy "Users can read own free music preferences"
  on public.free_music_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own free music preferences" on public.free_music_preferences;
create policy "Users can insert own free music preferences"
  on public.free_music_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own free music preferences" on public.free_music_preferences;
create policy "Users can update own free music preferences"
  on public.free_music_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
