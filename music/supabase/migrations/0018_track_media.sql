-- 2026-10-21 Suno V6 3차 ⑦⑧: Suno 커버 이미지(/suno/cover/generate)·뮤직비디오(/mp4/generate) 결과. 주인님 승인: 새 표 1개.
-- 곡(트랙)이 지워지면 함께 지워진다(30일 정리: app/api/cron/cleanup이 파일도 함께 지움).
create table if not exists public.music_track_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.music_tracks(id) on delete cascade,
  variant_id uuid references public.music_track_variants(id) on delete cascade,
  kind text not null check (kind in ('suno_cover', 'video')),
  task_id text,
  status text not null default 'generating' check (status in ('generating', 'completed', 'failed')),
  urls jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists music_track_media_track_idx on public.music_track_media(track_id);
create index if not exists music_track_media_task_idx on public.music_track_media(task_id);
create or replace function public.music_track_media_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists music_track_media_touch on public.music_track_media;
create trigger music_track_media_touch before update on public.music_track_media
  for each row execute function public.music_track_media_touch();
alter table public.music_track_media enable row level security;
revoke all on public.music_track_media from public, anon;
grant select, insert, update, delete on public.music_track_media to authenticated;
grant all on public.music_track_media to service_role;
create policy music_track_media_owner_all on public.music_track_media
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
update public.programs set version = 'v1.31', updated_at = now() where slug = 'music-automation';
select (select count(*) from public.music_track_media) as media_rows,
       (select file_size_limit from storage.buckets where id = 'music-audio') as bucket_limit;
