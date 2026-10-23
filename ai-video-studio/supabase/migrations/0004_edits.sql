-- AI 영상 스튜디오 v1.05 — 영상 합치기 편집 저장·완성본 갤러리 저장 (2026-10-23, Claude Code 윈도우, 세션 claude-win-avs-v105)
-- 대상: 운영 DB esgxyikcnnvmlhygjkth. avs_generations와 같은 틀(쓰기는 서버만, 회원은 본인 행 조회·삭제만, 30일 자동 정리).
-- project: 편집 구성 JSON(갤러리 생성 번호·AI 음악 스튜디오 곡 번호·자막·내레이션 문장 등 — 브라우저 blob 주소는 저장하지 않음)
-- 파일 경로: {user_id}/edits/{edit_id}/voice-{clip_id}.mp3|wav · video.mp4
create table if not exists public.avs_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 편집',
  project jsonb not null default '{}'::jsonb,
  voice_paths text[] not null default '{}',
  output_path text,
  output_bytes bigint,
  duration_s numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists avs_edits_user_created on public.avs_edits(user_id, created_at desc);
create index if not exists avs_edits_created on public.avs_edits(created_at);

alter table public.avs_edits enable row level security;
drop policy if exists avs_edits_select_own on public.avs_edits;
create policy avs_edits_select_own on public.avs_edits for select to authenticated using (auth.uid() = user_id);
drop policy if exists avs_edits_delete_own on public.avs_edits;
create policy avs_edits_delete_own on public.avs_edits for delete to authenticated using (auth.uid() = user_id);
revoke all on public.avs_edits from anon;

-- 저장소에 내레이션 음성(mp3·wav) 허용 추가. 크기 한도 50MB는 그대로.
update storage.buckets
set allowed_mime_types = array['video/mp4','image/jpeg','image/png','image/webp','audio/mpeg','audio/wav']
where id = 'ai-video-studio';
