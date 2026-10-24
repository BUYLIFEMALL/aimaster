-- 2026-10-24 주인님 승인: 카테고리 이름 「데이터수집|기획」 → 「데이터수집」
-- 기획 성격 프로그램 5개를 0042에서 다른 카테고리로 옮겨, 이제 수집 도구(web-crawler-saas·website-scraper)만 남았다.
-- slug(`scraping&plan`)·주소는 그대로 둔다(링크·필터 보존). 이름 한 칸만 바꾼다.
-- 되돌리기: update categories set name = '데이터수집|기획' where slug = 'scraping&plan';
update categories set name = '데이터수집'
where slug = 'scraping&plan' and name = '데이터수집|기획';

select name, slug, sort_order from categories where slug = 'scraping&plan';
