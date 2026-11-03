-- 스마트스토어 상품소싱기(네이버 쇼핑) 결과를 같은 표에 저장(2026-11-03 주인님 승인 「진행해」). 칸 추가만, 기존 자료는 그대로(마켓 기본값 쿠팡).
-- 네이버 쇼핑 호출은 회원 PC 확장에서만 하고 공개 상품 정보만 저장한다. 보관 1년은 쿠팡과 같다(docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8).
alter table public.coupang_review_runs add column if not exists market text not null default 'coupang';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'coupang_review_runs_market_check') then
    alter table public.coupang_review_runs add constraint coupang_review_runs_market_check check (market in ('coupang', 'naver'));
  end if;
end $$;
create index if not exists coupang_review_runs_user_market_created_idx on public.coupang_review_runs(user_id, market, created_at desc);

-- 네이버만: 구매 수(가격비교 상품은 0), 가격비교 판매처 수(0이면 판매처 한 곳), 판매처 이름
alter table public.coupang_review_items add column if not exists purchases integer;
alter table public.coupang_review_items add column if not exists sellers integer;
alter table public.coupang_review_items add column if not exists mall_name text;

update public.programs set updated_at = now() where slug = 'trending-product-finder';

select column_name, data_type, column_default from information_schema.columns
where table_schema = 'public' and table_name in ('coupang_review_runs', 'coupang_review_items') and column_name in ('market', 'purchases', 'sellers', 'mall_name')
order by table_name, column_name;
