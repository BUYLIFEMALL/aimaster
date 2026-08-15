-- music 서브프로젝트: Suno 음악 자동생성 파이프라인용 테이블 3개.
-- user_api_keys의 openai/suno provider는 auto-detail-page의 0001_multitenancy.sql에서
-- 이미 전체 제약에 등록해뒀으므로 여기서 다시 건드리지 않는다.

create table public.music_plannings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_description text not null,
  vocal_gender text check (vocal_gender in ('여성','남성')),  -- 선택 입력, GPT 스타일 생성 힌트용(보컬/인스트루멘탈 선택 아님)
  lang text not null default '한국어',
  style_description text,
  exclude_styles text,
  title text,           -- "한글 제목(English Title)" 형식
  description text,
  status text not null default 'draft'
    check (status in ('draft','planned','generating','completed','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_plannings_user_id_idx on public.music_plannings(user_id);

-- 생성 요청 1건 = Suno generate() 1회 호출 (보컬판/인스트루멘탈판/재생성마다 새 row)
create table public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  planning_id uuid not null references public.music_plannings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('vocal','instrumental')),
  title text not null,
  prompt_text text not null,      -- 보컬판: 가사 전문 / 인스트루멘탈판: BGM 프롬프트
  style_description text,
  exclude_styles text,
  suno_model text not null default 'V4_5',
  task_id text,                    -- Suno taskId, 웹훅 매칭 키
  status text not null default 'generating'
    check (status in ('generating','completed','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_tracks_planning_id_idx on public.music_tracks(planning_id);
create index music_tracks_user_id_idx on public.music_tracks(user_id);
create unique index music_tracks_task_id_idx on public.music_tracks(task_id) where task_id is not null;

-- Suno가 생성 1회당 보통 2개 variant를 주므로 이력 테이블로 분리 (shots.shorts_bgm_tracks와 동일 패턴)
create table public.music_track_variants (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.music_tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  suno_audio_id text,
  audio_url text not null,       -- 우리 Storage 영구 URL
  image_url text,
  duration_seconds int,
  created_at timestamptz not null default now()
);

create index music_track_variants_track_id_idx on public.music_track_variants(track_id);
create index music_track_variants_user_id_idx on public.music_track_variants(user_id);

-- updated_at 자동 갱신: AIMaster 공용 set_updated_at() 함수 재사용 (이미 다른 서브프로젝트에서 생성됨).
create trigger music_plannings_set_updated_at
  before update on public.music_plannings
  for each row execute function public.set_updated_at();

create trigger music_tracks_set_updated_at
  before update on public.music_tracks
  for each row execute function public.set_updated_at();

-- RLS: 3개 테이블 모두 owner-only. 웹훅 라우트는 세션이 없어 admin(service role) 클라이언트로
-- RLS를 우회해 task_id로 직접 조회/갱신한다 — 그래서 music_tracks/variants insert/update 정책도
-- 일반 사용자 흐름(가사 재생성 등)에서 필요하므로 만들어두되, 웹훅 라우트는 이 정책과 무관하게 동작한다.
alter table public.music_plannings enable row level security;
alter table public.music_tracks enable row level security;
alter table public.music_track_variants enable row level security;

create policy "music_plannings_owner_select" on public.music_plannings for select using (auth.uid() = user_id);
create policy "music_plannings_owner_insert" on public.music_plannings for insert with check (auth.uid() = user_id);
create policy "music_plannings_owner_update" on public.music_plannings for update using (auth.uid() = user_id);
create policy "music_plannings_owner_delete" on public.music_plannings for delete using (auth.uid() = user_id);

create policy "music_tracks_owner_select" on public.music_tracks for select using (auth.uid() = user_id);
create policy "music_tracks_owner_insert" on public.music_tracks for insert with check (auth.uid() = user_id);
create policy "music_tracks_owner_update" on public.music_tracks for update using (auth.uid() = user_id);
create policy "music_tracks_owner_delete" on public.music_tracks for delete using (auth.uid() = user_id);

create policy "music_track_variants_owner_select" on public.music_track_variants for select using (auth.uid() = user_id);
create policy "music_track_variants_owner_insert" on public.music_track_variants for insert with check (auth.uid() = user_id);
create policy "music_track_variants_owner_delete" on public.music_track_variants for delete using (auth.uid() = user_id);
