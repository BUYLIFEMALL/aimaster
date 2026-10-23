-- 2026-10-12 Antigravity: emotion-writer v1.03 UI 폰트 표준화 및 DB 버전 동기화
UPDATE public.programs
SET
  version = 'v1.03',
  updated_at = NOW()
WHERE slug = 'emotion-writer';
