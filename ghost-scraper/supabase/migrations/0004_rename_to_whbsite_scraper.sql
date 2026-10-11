-- 0004_rename_to_whbsite_scraper.sql
-- 프로그램 공식 명칭을 Whbsite Scraper로 변경 및 검색 키워드·요금제 보강

UPDATE programs
SET 
  name = 'Whbsite Scraper',
  short_desc = '[Whbsite Scraper / Website Scraper / GhostScraper] 웹사이트 URL 실시간 크롤링, 메타·구조·표·링크·이미지 추출 및 Gemini AI 스마트 리스트 변환 도구',
  updated_at = NOW()
WHERE slug = 'ghost-scraper';
