-- "MR(보컬제거) 만들기" 기능: 특정 variant(오디오)를 Suno vocal-removal로 보컬/반주 분리한다.
-- 가사 재생성이나 스타일 재생성과 무관한 순수 후처리 파생물이라 music_tracks/variants 모델에
-- 억지로 끼워넣지 않고 전용 테이블로 분리한다.
create table public.music_track_mr (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.music_track_variants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text,
  status text not null default 'generating' check (status in ('generating','completed','failed')),
  instrumental_url text,  -- MR(보컬 제거된 반주) — 우리 Storage 영구 URL
  vocal_url text,         -- 분리된 보컬만 있는 트랙(부가 산출물) — 우리 Storage 영구 URL
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_track_mr_variant_id_idx on public.music_track_mr(variant_id);
create index music_track_mr_user_id_idx on public.music_track_mr(user_id);
create unique index music_track_mr_task_id_idx on public.music_track_mr(task_id) where task_id is not null;

create trigger music_track_mr_set_updated_at
  before update on public.music_track_mr
  for each row execute function public.set_updated_at();

alter table public.music_track_mr enable row level security;

create policy "music_track_mr_owner_select" on public.music_track_mr for select using (auth.uid() = user_id);
create policy "music_track_mr_owner_insert" on public.music_track_mr for insert with check (auth.uid() = user_id);
create policy "music_track_mr_owner_update" on public.music_track_mr for update using (auth.uid() = user_id);
create policy "music_track_mr_owner_delete" on public.music_track_mr for delete using (auth.uid() = user_id);
