-- 쿠팡 상품소싱기 결과에 화면 순서(판매량순으로 읽으면 판매 순위)를 저장한다(2026-11-03 주인님 승인).
-- 칸만 더한다. 기존 행은 비워 두고(null) 화면에서는 리뷰 많은 순 뒤로 놓는다.
alter table public.coupang_review_items
  add column if not exists sales_rank integer check (sales_rank is null or sales_rank >= 1);

update public.programs set updated_at = now() where slug = 'trending-product-finder';
