-- v1.30 (2026-10-21) 유튜브 업로드 기록 — 주인님 승인(플랜 docs/PLAN_20261021_YOUTUBE_CONNECT_HISTORY.md).
-- 올릴 때마다 {videoId, url, privacy, publishAt, at}를 최근 10개까지 쌓는다. 기존 youtube_video_id·youtube_video_url은 「가장 최근 업로드」로 그대로 유지(호환).
alter table public.shorts_videos add column if not exists youtube_uploads jsonb not null default '[]'::jsonb;
-- 이미 올린 영상은 기존 결과를 첫 기록으로 옮긴다(공개 범위·시각은 알 수 없어 비움)
update public.shorts_videos
set youtube_uploads = jsonb_build_array(jsonb_build_object('videoId', youtube_video_id, 'url', youtube_video_url, 'privacy', null, 'publishAt', null, 'at', updated_at))
where youtube_video_id is not null and youtube_uploads = '[]'::jsonb;
update public.programs set version='v1.30', updated_at=now() where slug='auto-shorts-posting';
