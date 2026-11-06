-- AI 무료음악 자동화 — 원본 boks-music 이식 8번 가사 시간(2026-11-06, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth, 채팅 승인).
-- 곡마다 가사 줄의 시작·끝 시각. 원본 lyric-timing.mjs 구조: { lyricsHash, duration, status: automatic|manual|review, cues: [{ line, start, end }] }.
-- 칸 추가만(기존 자료 변경 없음). 곡 기록과 함께 30일 규칙을 따른다(관리자·시험 계정 제외).
ALTER TABLE public.free_music_tracks ADD COLUMN IF NOT EXISTS lyric_timing jsonb;

-- 확인
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'free_music_tracks' AND column_name = 'lyric_timing';
