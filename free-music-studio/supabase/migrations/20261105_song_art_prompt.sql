-- 곡의 앨범 그림 설명(영어, 선택) — AI 작곡 기획이 준 설명을 저장해 「앨범 그림 만들기」에 쓴다(2026-11-05 주인님 지시).
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 이 프로그램 표 1개에 칸 하나 추가(기존 행은 빈 글자), RLS 그대로.
ALTER TABLE public.free_music_songs ADD COLUMN IF NOT EXISTS art_prompt text NOT NULL DEFAULT '';
ALTER TABLE public.free_music_songs DROP CONSTRAINT IF EXISTS free_music_songs_art_prompt_len;
ALTER TABLE public.free_music_songs ADD CONSTRAINT free_music_songs_art_prompt_len CHECK (char_length(art_prompt) <= 1000);

-- 확인
SELECT column_name, data_type, column_default FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'free_music_songs' AND column_name = 'art_prompt';
