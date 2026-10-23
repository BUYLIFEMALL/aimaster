-- 2026-10-21 Suno V6 2차 ④: 구간 다시 만들기(sunoapi.org /generate/replace-section). 주인님 승인: music_tracks 칸 3개 추가.
-- 결과는 곡 연장처럼 새 트랙 행으로 쌓아 원곡을 보존한다. 원곡 변주가 30일 정리로 지워지면 null이 된다.
alter table public.music_tracks
  add column if not exists replaced_from_variant_id uuid references public.music_track_variants(id) on delete set null,
  add column if not exists replace_start_s numeric(8,2),
  add column if not exists replace_end_s numeric(8,2);
update public.programs set version = 'v1.29', updated_at = now() where slug = 'music-automation';
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'music_tracks' and column_name like 'replace%' order by 1;
