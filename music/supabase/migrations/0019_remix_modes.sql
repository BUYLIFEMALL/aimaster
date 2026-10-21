-- 2026-10-21 Suno V6 3차 ⑤⑥ (v1.34): 음악 Remix 스튜디오에 방식 3개 추가.
--   cover(기존 스타일 커버, /generate/upload-cover) · add_vocals(/generate/add-vocals) ·
--   add_instrumental(/generate/add-instrumental) · mashup(/generate/mashup, 원곡 2개)
-- 기존 리믹스 행은 모두 cover로 그대로 둔다.
alter table public.music_track_remixes
  add column mode text not null default 'cover'
    check (mode in ('cover', 'add_vocals', 'add_instrumental', 'mashup')),
  add column second_source_id uuid references public.music_remix_sources(id) on delete set null,
  add column second_source_audio_url text;

-- MR(보컬/반주 분리) 결과를 원곡으로 등록할 수 있게 kind에 'mr' 추가.
-- 파일은 그 곡 변주 폴더에 있어 30일 정리에서는 곡과 함께 지워진다(원곡 행 정리는 /remix-sources/ 파일만 지움).
alter table public.music_remix_sources drop constraint if exists music_remix_sources_kind_check;
alter table public.music_remix_sources
  add constraint music_remix_sources_kind_check check (kind in ('track', 'upload', 'mr'));
