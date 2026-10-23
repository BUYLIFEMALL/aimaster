-- 0005_set_web_scraping_category.sql
-- ghost-scraper를 Web Scraping 카테고리 최우선 순위(sort_order = 0)로 배정

UPDATE programs
SET 
  category_id = (SELECT id FROM categories WHERE slug = 'web-scraping' LIMIT 1),
  sort_order = 0,
  updated_at = NOW()
WHERE slug = 'ghost-scraper';

UPDATE programs
SET 
  sort_order = 1,
  updated_at = NOW()
WHERE slug = 'web-crawler-saas';
