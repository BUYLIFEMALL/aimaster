-- "곡 연장" 기능: 특정 variant(오디오)를 Suno /generate/extend로 이어붙인 결과를 새
-- music_tracks row로 저장한다. 어떤 variant를 연장한 결과인지 추적하기 위한 컬럼.
alter table public.music_tracks
  add column extended_from_variant_id uuid references public.music_track_variants(id) on delete set null;

create index music_tracks_extended_from_variant_id_idx
  on public.music_tracks(extended_from_variant_id)
  where extended_from_variant_id is not null;
