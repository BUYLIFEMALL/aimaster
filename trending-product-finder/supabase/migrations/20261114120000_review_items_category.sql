-- E2-3 네이버 분류 분포 (2026-11-14, [역할: ecommerce-image] claude-win-sdp, 주인님 「진행해」)
-- 확장 v1.39 이상이 네이버 쇼핑 검색 자료의 분류 경로(category1Name~category4Name, 「>」로 이음)를 보낸다.
-- 칸 추가만 한다(기존 행은 null, RLS·정리 규칙은 표 그대로). 웹 배포보다 먼저 적용해야 조회가 깨지지 않는다.
alter table public.coupang_review_items add column if not exists category text;
