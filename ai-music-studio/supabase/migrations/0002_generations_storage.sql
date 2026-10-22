-- AI 음악 스튜디오 v1.01 — 생성 기록 표·비공개 저장소·공용 키 이름 (2026-10-23, Claude Code 윈도우)
-- 대상: 운영 DB esgxyikcnnvmlhygjkth.
-- 한 행 = 모델 하나에 보낸 생성 요청 1건. 비교 생성은 같은 compare_group으로 묶는다.
-- 쓰기(insert/update)는 서버(관리자 키)만 — 권한 확인 뒤 회원 본인 user_id로만 쓴다. 회원은 본인 행 조회·삭제만.
create table if not exists public.ams_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  compare_group uuid,
  provider text not null check (provider in ('gemini','elevenlabs','fal','replicate','suno')),
  model text not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  title text,
  prompt text not null,
  lyrics text,
  instrumental boolean not null default false,
  duration_s integer,
  options jsonb not null default '{}'::jsonb,
  provider_task_id text,
  provider_meta jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '[]'::jsonb,
  lyrics_out text,
  error_message text,
  est_cost_usd numeric(8,4),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ams_generations_user_created on public.ams_generations(user_id, created_at desc);
create index if not exists ams_generations_created on public.ams_generations(created_at);

alter table public.ams_generations enable row level security;
drop policy if exists ams_generations_select_own on public.ams_generations;
create policy ams_generations_select_own on public.ams_generations for select to authenticated using (auth.uid() = user_id);
drop policy if exists ams_generations_delete_own on public.ams_generations;
create policy ams_generations_delete_own on public.ams_generations for delete to authenticated using (auth.uid() = user_id);
revoke all on public.ams_generations from anon;

-- 비공개 저장소: 경로 {user_id}/{generation_id}/{n}.{mp3|wav}. 재생·다운로드는 서버가 만든 서명 주소로만.
-- 프로젝트 전체 업로드 한도 50MB(지출 상한, music v1.41 기록)와 같게 둔다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-music-studio', 'ai-music-studio', false, 52428800,
        array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/aac','audio/ogg','audio/flac','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 공용 user_api_keys 허용 목록에 이 프로그램이 쓰는 이름이 없으면 추가(기존 이름 그대로, 한 번 등록하면 모든 프로그램 재사용).
do $$ declare def text; p text; begin
  select pg_get_constraintdef(c.oid) into def from pg_constraint c join pg_class t on t.oid = c.conrelid
   where t.relname = 'user_api_keys' and c.conname = 'user_api_keys_provider_check';
  if def is null then return; end if;
  foreach p in array array['gemini','elevenlabs','fal','replicate','suno','openai'] loop
    if def !~ ('[{,]' || p || '[,}]') then def := replace(def, chr(39) || chr(123), chr(39) || chr(123) || p || ','); end if;
  end loop;
  execute 'alter table public.user_api_keys drop constraint user_api_keys_provider_check';
  execute 'alter table public.user_api_keys add constraint user_api_keys_provider_check ' || def;
end $$;
