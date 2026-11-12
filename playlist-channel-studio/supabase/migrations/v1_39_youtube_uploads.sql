-- v1.39 (2026-11-13) 유튜브 올리기 기록 — 주인님 승인(플랜 docs/PLAN_20261113_YOUTUBE_UPLOAD_RECORDS.md).
-- 워크스페이스 「콘텐츠 캘린더」 연동의 전제. 쓰기는 서버(/api/youtube/uploads, 유튜브에서 영상을 확인한 뒤)만, 읽기는 회원 본인만.
create table if not exists public.playlist_youtube_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  url text not null,
  title text not null,
  privacy text not null check (privacy in ('private', 'unlisted', 'public')),
  publish_at timestamptz,
  channel_account_id uuid,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);
create index if not exists playlist_youtube_uploads_user_idx on public.playlist_youtube_uploads (user_id, uploaded_at desc);
alter table public.playlist_youtube_uploads enable row level security;
drop policy if exists "playlist_youtube_uploads_select_own" on public.playlist_youtube_uploads;
create policy "playlist_youtube_uploads_select_own" on public.playlist_youtube_uploads for select using (auth.uid() = user_id);

update public.programs set version = 'v1.39', updated_at = now() where slug = 'playlist-channel-studio';
