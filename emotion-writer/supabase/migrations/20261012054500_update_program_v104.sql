-- 2026-10-12 Antigravity: emotion-writer v1.04 제목 밀림 방지/헤더 여백 축소 및 사이드바 하단 메뉴 끌어올림
UPDATE public.programs
SET
  version = 'v1.04',
  updated_at = NOW()
WHERE slug = 'emotion-writer';
