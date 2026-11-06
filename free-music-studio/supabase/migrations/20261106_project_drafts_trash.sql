-- AI 무료음악 자동화 — 원본 boks-music 이식 4번·6번 묶음 DB (2026-11-06, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth)
-- 플랜: free-music-studio/docs/PLAN_20261106_ORIGINAL_PORT_ALL.md. 실행은 주인님 승인 뒤. 칸·색인 추가만(기존 자료 변경·삭제 없음).

-- 4번: 곡 만들기 초안이 어느 프로젝트 것인지(프로젝트 안에서 만들기·프로젝트별 초안). 프로젝트를 지우면 연결만 비움.
ALTER TABLE public.free_music_songs
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.free_music_collections(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS free_music_songs_project_idx ON public.free_music_songs (project_id);

-- 6번: 휴지통(원본 trash.mjs) — 넣은 시각과 같이 넣은 묶음 번호. 비어 있으면 휴지통이 아님.
-- 30일 지나면 /api/cron/cleanup이 비운다(관리자·시험 계정 profiles.retention_exempt 제외).
ALTER TABLE public.free_music_tracks
  ADD COLUMN IF NOT EXISTS trashed_at timestamptz,
  ADD COLUMN IF NOT EXISTS trash_batch_id uuid;
CREATE INDEX IF NOT EXISTS free_music_tracks_trashed_idx ON public.free_music_tracks (user_id, trashed_at) WHERE trashed_at IS NOT NULL;

-- 확인
SELECT table_name, column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND ((table_name = 'free_music_songs' AND column_name = 'project_id') OR (table_name = 'free_music_tracks' AND column_name IN ('trashed_at', 'trash_batch_id')))
ORDER BY table_name, column_name;
