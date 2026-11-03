-- AI 무료음악 자동화(free-music-studio) v1.06 — 가져온 음악(커버·일부만 다시 만들기) (2026-11-03, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth)
--  - 회원 PC의 원곡 파일로 ACE-Step cover/repaint. 원곡 파일은 브라우저 → 회원 PC 엔진으로만 가고 서버에 저장하지 않는다.
--  - 곡 기록에 종류 칸(kind) 추가. 커버는 원곡 길이를 따르므로 길이 제한을 10~600초로 넓힌다(ACE-Step 허용 범위).
--  - 기존 곡은 kind = 'text2music'으로 채워진다. 기존 표·자료는 그대로.

ALTER TABLE public.free_music_tracks
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text2music';

ALTER TABLE public.free_music_tracks DROP CONSTRAINT IF EXISTS free_music_tracks_kind_check;
ALTER TABLE public.free_music_tracks
  ADD CONSTRAINT free_music_tracks_kind_check CHECK (kind IN ('text2music', 'cover', 'repaint'));

ALTER TABLE public.free_music_tracks DROP CONSTRAINT IF EXISTS free_music_tracks_duration_sec_check;
ALTER TABLE public.free_music_tracks
  ADD CONSTRAINT free_music_tracks_duration_sec_check CHECK (duration_sec BETWEEN 10 AND 600);
