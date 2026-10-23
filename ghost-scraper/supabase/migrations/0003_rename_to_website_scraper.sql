-- 0003_rename_to_website_scraper.sql
-- 프로그램 공식 명칭을 Website Scraper로 변경 및 v1.03 갱신

UPDATE programs
SET 
  name = 'Website Scraper',
  version = 'v1.03',
  updated_at = NOW()
WHERE slug = 'ghost-scraper';
