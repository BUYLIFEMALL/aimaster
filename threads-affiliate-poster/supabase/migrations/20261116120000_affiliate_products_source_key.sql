-- 2026-11-16 threads-auto 이식 1단계(주인님 결정 6): 쿠팡 상품 번호 칸.
-- 검색·골드박스·베스트·PL 후보에서 「이미 등록한 상품」을 정확히 빼려고 쓴다. 다른 플랫폼은 비워 둔다.
alter table public.affiliate_products add column if not exists source_key text;

-- 기존 쿠팡 상품: 검색 결과 추적 링크(link.coupang.com/re/AFFSDP?...&pageKey=번호)에서 번호를 채운다.
-- 단축 링크(link.coupang.com/a/…)는 번호가 없어 그대로 둔다.
update public.affiliate_products
set source_key = substring(product_url from 'pageKey=([0-9]+)')
where platform = 'coupang' and source_key is null and product_url ~ 'pageKey=[0-9]+';

create index if not exists affiliate_products_user_platform_source_key_idx
  on public.affiliate_products (user_id, platform, source_key)
  where source_key is not null;
