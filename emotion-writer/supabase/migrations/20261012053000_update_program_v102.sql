-- 2026-10-12 Antigravity: emotion-writer v1.02 디자인/템플릿 전면 개편 및 DB 버전 동기화
UPDATE public.programs
SET
  version = 'v1.02',
  updated_at = NOW()
WHERE slug = 'emotion-writer';
