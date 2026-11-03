-- AI 무료음악 자동화(free-music-studio) v1.05 — 프로젝트·플레이리스트 (2026-11-03, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth)
--  - 원본 앱 메뉴(PROJECTS·PLAYLISTS)를 웹으로. 회원별 소유(user_id + owner-only RLS).
--  - 프로젝트: 곡을 폴더처럼 묶음(한 곡은 한 프로젝트) → free_music_tracks.project_id. 프로젝트를 지우면 곡은 남고 묶음만 풀림.
--  - 플레이리스트: 곡을 순서대로 담음(한 곡을 여러 목록에) → free_music_playlist_items. 곡·목록이 지워지면 담긴 줄도 지워짐.
--  - 묶음 이름은 회원이 만든 정리 정보라 30일 자동 삭제 대상이 아니다(곡 기록은 그대로 30일).

CREATE TABLE IF NOT EXISTS public.free_music_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('project', 'playlist')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS free_music_collections_user_idx ON public.free_music_collections (user_id, kind, created_at);

ALTER TABLE public.free_music_tracks
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.free_music_collections(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS free_music_tracks_project_idx ON public.free_music_tracks (project_id);

CREATE TABLE IF NOT EXISTS public.free_music_playlist_items (
  playlist_id uuid NOT NULL REFERENCES public.free_music_collections(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.free_music_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id)
);
CREATE INDEX IF NOT EXISTS free_music_playlist_items_order_idx ON public.free_music_playlist_items (playlist_id, position);

ALTER TABLE public.free_music_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_music_playlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS free_music_collections_owner ON public.free_music_collections;
CREATE POLICY free_music_collections_owner ON public.free_music_collections
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS free_music_playlist_items_owner ON public.free_music_playlist_items;
CREATE POLICY free_music_playlist_items_owner ON public.free_music_playlist_items
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
