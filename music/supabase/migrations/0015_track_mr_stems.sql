-- 2026-10-21 Suno V6 1차 ②: 악기별 12트랙 분리(sunoapi.org vocal-removal type=split_stem). 주인님 승인: MR 표에 칸 2개 추가.
-- type: separate_vocal(기존 MR, 보컬/반주 2트랙) | split_stem(최대 12트랙). 기존 행은 separate_vocal.
-- stems: {"vocal": "<우리 저장소 주소>", "drums": "...", ...} — 화면은 서명 주소로 바꿔 보여 주고(lib/storageSign.ts), 30일 정리에 포함.
alter table public.music_track_mr
  add column if not exists type text not null default 'separate_vocal'
    check (type in ('separate_vocal', 'split_stem')),
  add column if not exists stems jsonb;
update public.programs set version = 'v1.24', updated_at = now() where slug = 'music-automation';
select column_name, data_type, column_default from information_schema.columns
 where table_schema = 'public' and table_name = 'music_track_mr' and column_name in ('type', 'stems');
