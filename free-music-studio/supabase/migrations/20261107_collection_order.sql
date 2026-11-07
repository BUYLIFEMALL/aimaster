-- AI 무료음악 자동화 v1.31 — 프로젝트·플레이리스트 순서, 프로젝트 안 곡 순서(2026-11-07, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth, 채팅 승인).
-- 주인님 「순서 이동 시킬수 있게 해줘」「플레이 리스트도」「곡순서도 바꿀수 있게 해줘」.
-- 칸 추가만(기존 자료 변경 없음). 순서가 비어 있으면(null) 예전처럼 만든 순서·최신순으로 보인다.
ALTER TABLE public.free_music_collections ADD COLUMN IF NOT EXISTS position integer;
ALTER TABLE public.free_music_tracks ADD COLUMN IF NOT EXISTS project_position integer;
