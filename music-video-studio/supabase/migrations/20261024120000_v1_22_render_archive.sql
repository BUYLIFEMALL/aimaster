-- 뮤직비디오 v1.22 — 완성본 보관 (2026-10-24, Claude Code 윈도우, 음악 담당 세션 claude-win-20261024-music, 주인님 승인)
-- 대상: 운영 DB esgxyikcnnvmlhygjkth. 기준: ai-video-studio 0004_edits.sql(avs_edits)과 같은 틀 —
-- 쓰기는 서버(서비스 키)만, 회원은 본인 행 조회·삭제만, anon 차단, 생성일 기준 30일 자동 정리(/api/cron/cleanup).
-- 파일 경로: {user_id}/renders/{id}.mp4 — 브라우저가 서명 업로드 주소로 바로 올린다(Vercel 본문 4.5MB 제한 회피).
create table if not exists public.mvs_renders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '뮤직비디오',
  song_title text,
  output_path text not null,
  output_bytes bigint not null,
  duration_s numeric(8,2),
  width int,
  height int,
  uploaded boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists mvs_renders_user_created on public.mvs_renders(user_id, created_at desc);
create index if not exists mvs_renders_created on public.mvs_renders(created_at);

alter table public.mvs_renders enable row level security;
drop policy if exists mvs_renders_select_own on public.mvs_renders;
create policy mvs_renders_select_own on public.mvs_renders for select to authenticated using (auth.uid() = user_id);
drop policy if exists mvs_renders_delete_own on public.mvs_renders;
create policy mvs_renders_delete_own on public.mvs_renders for delete to authenticated using (auth.uid() = user_id);
revoke all on public.mvs_renders from anon;

-- 비공개 저장소: MP4만, 50MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music-video-studio', 'music-video-studio', false, 52428800, array['video/mp4'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['video/mp4'];

-- 버전(programs.version v1.22)은 배포 때 scripts/deploy.mjs --set-version이 올린다.
