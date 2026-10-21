-- AI 가사영상 자동화 — 회원별 저장 데이터(프로젝트: 가사 시간표·디자인·제목) 한 테이블 + 30일 자동 삭제 (2026-10-21 v1.01)
-- 음악·커버·영상 파일은 저장하지 않는다(회원 PC에서만 처리). shorts_onestop_items와 같은 구조, document-translator 보관 기간 패턴.
create table if not exists public.lyric_video_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('project')),
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lyric_video_items_user_kind_idx on public.lyric_video_items(user_id, kind, updated_at desc);
create index if not exists lyric_video_items_created_idx on public.lyric_video_items(created_at);

alter table public.lyric_video_items enable row level security;
drop policy if exists "lyric_video_items_select_own" on public.lyric_video_items;
drop policy if exists "lyric_video_items_insert_own" on public.lyric_video_items;
drop policy if exists "lyric_video_items_update_own" on public.lyric_video_items;
drop policy if exists "lyric_video_items_delete_own" on public.lyric_video_items;
create policy "lyric_video_items_select_own" on public.lyric_video_items for select using (auth.uid() = user_id);
create policy "lyric_video_items_insert_own" on public.lyric_video_items for insert with check (auth.uid() = user_id);
create policy "lyric_video_items_update_own" on public.lyric_video_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lyric_video_items_delete_own" on public.lyric_video_items for delete using (auth.uid() = user_id);

-- 생성일 기준 30일 뒤 자동 삭제(최상위 규칙: 생성 데이터 30일 보관). 이 프로그램 표만 지운다.
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'lyric-video-studio-retention';
select cron.schedule('lyric-video-studio-retention', '17 * * * *',
  $$delete from public.lyric_video_items where created_at < now() - interval '30 days'$$);
