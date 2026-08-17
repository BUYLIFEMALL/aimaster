-- "리믹스" 기능(Make.com 시나리오 41 대응): 업로드한(또는 이미 생성한 곡을 재사용한) 원곡
-- 오디오를 Suno `/generate/upload-cover`로 새 스타일로 리메이크한다. 기획→가사 흐름과 무관한
-- 독립적인 입력 모델(원곡 오디오 + 원하는 느낌)이라 music_plannings/music_tracks에 끼워넣지
-- 않고 MR/WAV와 동일하게 전용 테이블로 분리한다.
create table public.music_track_remixes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_audio_url text not null,   -- 리믹스할 원곡 오디오 (업로드본 또는 기존 variant 재사용)
  source_title text,                -- 원곡 제목(선택) — Suno title에 "{원곡 제목} Remix"로 사용
  desired_feel text not null,       -- "원하는 느낌/분위기" 사용자 입력
  lyrics text,                      -- 가사(선택) — Suno의 prompt로 그대로 전달
  style_description text,           -- GPT가 만든 이번 리믹스 스타일(영어)
  style_weight numeric,             -- Suno styleWeight (0~1)
  weirdness_constraint numeric,     -- Suno weirdnessConstraint (0~1)
  audio_weight numeric,             -- Suno audioWeight (0~1)
  vocal_gender text check (vocal_gender in ('여성','남성','혼성')),
  suno_model text not null default 'V5_5',
  task_id text,                     -- Suno taskId, 웹훅 매칭 키
  status text not null default 'generating'
    check (status in ('generating','completed','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_track_remixes_user_id_idx on public.music_track_remixes(user_id);
create unique index music_track_remixes_task_id_idx on public.music_track_remixes(task_id) where task_id is not null;

-- 결과 오디오/커버이미지 — music_track_variants와 동일 구조(Suno가 보통 2개 테이크를 준다).
create table public.music_track_remix_variants (
  id uuid primary key default gen_random_uuid(),
  remix_id uuid not null references public.music_track_remixes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  suno_audio_id text,
  audio_url text not null,          -- 우리 Storage 영구 URL
  image_url text,
  duration_seconds int,
  created_at timestamptz not null default now()
);

create index music_track_remix_variants_remix_id_idx on public.music_track_remix_variants(remix_id);
create index music_track_remix_variants_user_id_idx on public.music_track_remix_variants(user_id);

create trigger music_track_remixes_set_updated_at
  before update on public.music_track_remixes
  for each row execute function public.set_updated_at();

alter table public.music_track_remixes enable row level security;
alter table public.music_track_remix_variants enable row level security;

create policy "music_track_remixes_owner_select" on public.music_track_remixes for select using (auth.uid() = user_id);
create policy "music_track_remixes_owner_insert" on public.music_track_remixes for insert with check (auth.uid() = user_id);
create policy "music_track_remixes_owner_update" on public.music_track_remixes for update using (auth.uid() = user_id);
create policy "music_track_remixes_owner_delete" on public.music_track_remixes for delete using (auth.uid() = user_id);

create policy "music_track_remix_variants_owner_select" on public.music_track_remix_variants for select using (auth.uid() = user_id);
create policy "music_track_remix_variants_owner_insert" on public.music_track_remix_variants for insert with check (auth.uid() = user_id);
create policy "music_track_remix_variants_owner_delete" on public.music_track_remix_variants for delete using (auth.uid() = user_id);
