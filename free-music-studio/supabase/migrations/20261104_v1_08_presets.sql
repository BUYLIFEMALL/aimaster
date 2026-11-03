-- AI 무료음악 자동화(free-music-studio) v1.08 — 내 프리셋·목표 길이 5분 (2026-11-04, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth)
--  - 주인님 승인(2026-11-04 채팅 「DB 표 만들어서 2단계 진행해」).
--  - 내 프리셋: 회원이 스타일 칸 내용을 이름 붙여 저장(노래·연주곡 따로). 회원별 소유(user_id + owner-only RLS), 한 회원 50개까지(앱에서 검사).
--    회원이 만든 설정이라 30일 자동 삭제 대상이 아니다(프로젝트·플레이리스트 이름과 같음).
--  - 곡 길이 5분(300초) 추가 — free_music_songs의 길이 제약을 넓힌다(free_music_tracks는 v1.06에서 이미 10~600초).

CREATE TABLE IF NOT EXISTS public.free_music_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  prompt text NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 400),
  mode text NOT NULL CHECK (mode IN ('vocal', 'instrumental')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS free_music_presets_user_idx ON public.free_music_presets (user_id, mode, created_at);

ALTER TABLE public.free_music_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS free_music_presets_owner ON public.free_music_presets;
CREATE POLICY free_music_presets_owner ON public.free_music_presets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.free_music_songs DROP CONSTRAINT IF EXISTS free_music_songs_duration_sec_check;
ALTER TABLE public.free_music_songs
  ADD CONSTRAINT free_music_songs_duration_sec_check CHECK (duration_sec IN (30, 60, 120, 180, 240, 300));
