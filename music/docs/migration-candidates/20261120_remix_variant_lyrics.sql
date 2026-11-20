-- 【적용하지 않은 후보 — 승인 전 실행 금지】 리믹스 가사 보존 1차 (2026-11-20 Claud(Music), Master msg_66e3a3384a9e)
-- 설계: music/docs/PLAN_20261120_REMIX_LYRICS_PERSISTENCE.md 0-2·6절·1차 인계표. 운영 DB 적용은 주인님·Master 승인 뒤
-- music/supabase/migrations/ 로 옮겨(번호 확정) 적용한다. 더하기만 — 기존 행·기존 코드에 영향 없음.

alter table public.music_track_remix_variants
  add column if not exists suno_task_id text,                    -- 이 변주를 만든 Suno 작업 번호(자동 연장 단계별)
  add column if not exists lyrics text,                           -- Suno가 돌려준 곡별 가사(코드 포인트 5,000 이내)
  add column if not exists lyrics_status text not null default 'unknown';

-- provided는 실측으로 record-info 가사 칸이 확정된 뒤에만 쓰는 예약 값(1차 코드는 쓰지 않음)
alter table public.music_track_remix_variants
  drop constraint if exists music_track_remix_variants_lyrics_status_check;
alter table public.music_track_remix_variants
  add constraint music_track_remix_variants_lyrics_status_check
  check (lyrics_status in ('provided', 'provided_unverified', 'empty', 'not_applicable', 'unknown'));

-- 새 정책 없음: 기존 본인 읽기 정책(music_track_remix_variants_owner_select)이 행 전체에 적용된다.
-- 확인(적용 직후, 읽기만):
--   select column_name, data_type, column_default from information_schema.columns
--   where table_schema = 'public' and table_name = 'music_track_remix_variants'
--     and column_name in ('suno_task_id', 'lyrics', 'lyrics_status');
