-- 0006_rename_slug_to_whbsite_scraper.sql
-- 프로그램 슬러그 및 배포 주소를 whbsite-scraper / https://whbsite-scraper.buylife.xyz 로 변경 및 v1.04 판올림

UPDATE programs
SET 
  slug = 'whbsite-scraper',
  name = 'Whbsite Scraper',
  app_url = 'https://whbsite-scraper.buylife.xyz',
  version = 'v1.04',
  short_desc = '[Whbsite Scraper / Website Scraper / GhostScraper / ghost-scraper] 웹사이트 URL 실시간 크롤링, 메타·구조·표·링크·이미지 추출 및 Gemini AI 스마트 리스트 변환 도구',
  sort_order = 0,
  updated_at = NOW()
WHERE id = '45e4c01b-cfb0-4cf1-99db-27e49ea754c3';
