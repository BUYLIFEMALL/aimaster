-- programs.app_url이 최초 등록(0001_init.sql) 때 누락되어 있었다 — 메인 사이트(buylife.xyz)
-- 프로그램 카탈로그에서 "바로가기" 링크가 비어있던 원인. 배포된 Vercel URL로 채운다.
UPDATE programs
SET app_url = 'https://trending-product-finder.vercel.app'
WHERE slug = 'trending-product-finder';
