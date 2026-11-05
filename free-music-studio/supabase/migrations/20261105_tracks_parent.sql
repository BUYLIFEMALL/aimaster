-- AI 무료음악 자동화 — 커버·부분 수정 곡에 원곡 번호(2026-11-05, 내 곡에서 바로 커버)
-- 원본 boks-music의 tracks[].parentId와 같은 뜻. 원곡 기록이 지워지면 연결만 비운다(커버 곡은 남김).
ALTER TABLE public.free_music_tracks
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.free_music_tracks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS free_music_tracks_parent_idx ON public.free_music_tracks (parent_id);
