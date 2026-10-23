-- AI 영상 스튜디오 v1.01 — 생성 기록 표·비공개 저장소 (2026-10-23, Claude Code 윈도우)
-- 대상: 운영 DB esgxyikcnnvmlhygjkth. AI 음악 스튜디오 ams_generations와 같은 틀.
-- 한 행 = 영상 생성 요청 1건. 쓰기(insert/update)는 서버(관리자 키)만 — 권한 확인 뒤 회원 본인 user_id로만 쓴다. 회원은 본인 행 조회·삭제만.
create table if not exists public.avs_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gemini','fal','replicate')),
  model text not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  prompt text not null,
  aspect_ratio text check (aspect_ratio in ('16:9','9:16')),
  duration_s integer not null,
  start_image text,
  end_image text,
  options jsonb not null default '{}'::jsonb,
  provider_task_id text,
  provider_meta jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '[]'::jsonb,
  error_message text,
  est_cost_usd numeric(8,4),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists avs_generations_user_created on public.avs_generations(user_id, created_at desc);
create index if not exists avs_generations_created on public.avs_generations(created_at);

alter table public.avs_generations enable row level security;
drop policy if exists avs_generations_select_own on public.avs_generations;
create policy avs_generations_select_own on public.avs_generations for select to authenticated using (auth.uid() = user_id);
drop policy if exists avs_generations_delete_own on public.avs_generations;
create policy avs_generations_delete_own on public.avs_generations for delete to authenticated using (auth.uid() = user_id);
revoke all on public.avs_generations from anon;

-- 비공개 저장소: 경로 {user_id}/{generation_id}/video.mp4 · start.jpg · end.jpg. 보기·내려받기는 서버가 만든 서명 주소로만.
-- 프로젝트 전체 업로드 한도 50MB(지출 상한)와 같게 둔다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-video-studio', 'ai-video-studio', false, 52428800, array['video/mp4','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
