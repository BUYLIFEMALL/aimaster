-- AI 무료음악 자동화(free-music-studio) v1.03 — 「모든 음악」 곡 기록 표 (2026-11-03, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth)
--  - 내 PC 엔진으로 만든 노래 한 곡당 한 줄. 음원 파일은 회원 PC 엔진 보관 폴더에 같은 id 이름으로 있다(서버에 음원 없음).
--  - id는 브라우저가 만든 uuid(엔진 파일 이름과 같게). 회원별 소유(user_id + owner-only RLS).
--  - 30일 자동 삭제는 /api/cron/cleanup(관리자·시험 계정 profiles.retention_exempt 제외).
--  - song_id: 어느 가사 초안에서 만들었는지. 초안을 지워도 곡 기록은 남는다(on delete set null).

CREATE TABLE IF NOT EXISTS public.free_music_tracks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id uuid REFERENCES public.free_music_songs(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  style_prompt text NOT NULL DEFAULT '' CHECK (char_length(style_prompt) <= 400),
  lyrics text NOT NULL DEFAULT '' CHECK (char_length(lyrics) <= 4000),
  duration_sec integer NOT NULL CHECK (duration_sec IN (30, 60, 120, 180, 240)),
  device text NOT NULL CHECK (device IN ('cuda', 'mps', 'cpu')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS free_music_tracks_user_created_idx ON public.free_music_tracks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS free_music_tracks_created_idx ON public.free_music_tracks (created_at);

ALTER TABLE public.free_music_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS free_music_tracks_owner ON public.free_music_tracks;
CREATE POLICY free_music_tracks_owner ON public.free_music_tracks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
