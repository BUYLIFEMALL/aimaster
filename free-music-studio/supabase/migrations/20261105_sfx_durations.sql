-- 효과음(가사 칸 [SFX], Stable Audio 3 전용, 2026-11-05) 3~30초를 저장할 수 있게 길이 제한을 넓힌다.
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 이 프로그램 표 2개만(다른 프로그램 영향 없음). 기존 행은 모두 새 범위 안이다.
-- 화면·API 검사(src/lib/songs.ts parseSongInput)가 곡은 30~300초, 효과음은 3~30초 목록으로 따로 막는다.

ALTER TABLE public.free_music_songs DROP CONSTRAINT IF EXISTS free_music_songs_duration_sec_check;
ALTER TABLE public.free_music_songs
  ADD CONSTRAINT free_music_songs_duration_sec_check CHECK (duration_sec IN (3, 5, 10, 15, 20, 30, 60, 120, 180, 240, 300));

ALTER TABLE public.free_music_tracks DROP CONSTRAINT IF EXISTS free_music_tracks_duration_sec_check;
ALTER TABLE public.free_music_tracks
  ADD CONSTRAINT free_music_tracks_duration_sec_check CHECK (duration_sec BETWEEN 1 AND 600);

-- 확인
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conname IN ('free_music_songs_duration_sec_check', 'free_music_tracks_duration_sec_check');
