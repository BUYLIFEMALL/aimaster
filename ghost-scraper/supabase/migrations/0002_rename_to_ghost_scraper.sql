-- GhostScraper PRO -> GhostScraper 명칭 변경 및 v1.02 판올림
UPDATE public.programs
SET
  name = 'GhostScraper',
  version = 'v1.02',
  updated_at = NOW()
WHERE slug = 'ghost-scraper';
