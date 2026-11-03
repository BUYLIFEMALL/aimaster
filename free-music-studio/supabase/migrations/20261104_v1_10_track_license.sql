-- AI 무료음악 자동화(free-music-studio) v1.10 — 곡 기록 상업용/비상업용 구분 (2026-11-04, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth)
--  - 주인님 승인(2026-11-04 채팅 「승인」, 칸 하나). 플랜: docs/PLAN_20261104_YUE2_NONCOMMERCIAL.md
--  - license: commercial(ACE-Step 1.5, MIT) | noncommercial(YuE2 등 CC BY-NC — 수익 창출 영상·판매 불가). 기존 곡은 모두 commercial.

ALTER TABLE public.free_music_tracks
  ADD COLUMN IF NOT EXISTS license text NOT NULL DEFAULT 'commercial';

ALTER TABLE public.free_music_tracks DROP CONSTRAINT IF EXISTS free_music_tracks_license_check;
ALTER TABLE public.free_music_tracks
  ADD CONSTRAINT free_music_tracks_license_check CHECK (license IN ('commercial', 'noncommercial'));
