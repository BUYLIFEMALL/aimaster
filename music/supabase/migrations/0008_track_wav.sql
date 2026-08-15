-- "WAV 변환" 기능: 특정 variant(오디오, mp3)를 Suno wav/generate로 고음질 WAV로 변환한다.
-- MR과 마찬가지로 가사/스타일과 무관한 순수 후처리 파생물이라 전용 테이블로 분리한다.
create table public.music_track_wav (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.music_track_variants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text,
  status text not null default 'generating' check (status in ('generating','completed','failed')),
  wav_url text,  -- 우리 Storage 영구 URL
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_track_wav_variant_id_idx on public.music_track_wav(variant_id);
create index music_track_wav_user_id_idx on public.music_track_wav(user_id);
create unique index music_track_wav_task_id_idx on public.music_track_wav(task_id) where task_id is not null;

create trigger music_track_wav_set_updated_at
  before update on public.music_track_wav
  for each row execute function public.set_updated_at();

alter table public.music_track_wav enable row level security;

create policy "music_track_wav_owner_select" on public.music_track_wav for select using (auth.uid() = user_id);
create policy "music_track_wav_owner_insert" on public.music_track_wav for insert with check (auth.uid() = user_id);
create policy "music_track_wav_owner_update" on public.music_track_wav for update using (auth.uid() = user_id);
create policy "music_track_wav_owner_delete" on public.music_track_wav for delete using (auth.uid() = user_id);
