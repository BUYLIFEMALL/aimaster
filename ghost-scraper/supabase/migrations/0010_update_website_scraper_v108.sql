-- 0010_update_website_scraper_v108.sql
-- Vercel 도메인 정리 및 HelpModal/auth.ts 내 잔여 오타 전면 교정, v1.08 판올림

UPDATE programs
SET 
  version = 'v1.08',
  updated_at = NOW()
WHERE id = '45e4c01b-cfb0-4cf1-99db-27e49ea754c3';
