-- AI 무료음악 자동화 — 원본 boks-music 이식 7번 마스터링(2026-11-06, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth, 채팅 승인).
-- 마스터링본을 새 곡(kind 'master', parent_id = 원곡)으로 기록할 수 있게 종류 제약만 넓힌다. 기존 자료 변경 없음.
ALTER TABLE public.free_music_tracks DROP CONSTRAINT IF EXISTS free_music_tracks_kind_check;
ALTER TABLE public.free_music_tracks
  ADD CONSTRAINT free_music_tracks_kind_check CHECK (kind IN ('text2music', 'cover', 'repaint', 'master'));

-- 확인
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'free_music_tracks_kind_check';
