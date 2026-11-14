-- AI 쇼핑몰 빌더 M1-3 — 최저 판매가 보호에 리셀러 수수료 포함 (2026-11-14 마스터 플랜 §7-2 「막기」)
-- 리셀러 수수료 = 실제 결제 품목 금액 × 리셀러율 → 본사가 손해 보지 않으려면 결제 단가 ≥ 공급가 ÷ (1 − 리셀러율).
-- 하한 = greatest(공급가 × (1 + 최소 마진), 공급가 ÷ (1 − 리셀러율)) — 판매가(+옵션)를 넘지는 않음. 리셀러율 0%면 0057과 같다.
-- 하한은 이 함수 하나에 모여 있어(화면 price_rules_for·회원/비회원 주문 함수가 모두 부름) 함수 본문만 바꾼다.
create or replace function mall_builder_private.price_floor(p_product uuid, p_base bigint)
returns bigint language sql stable security definer set search_path = '' as $$
  select least(greatest(ceil(s.supply_price * (100 + coalesce(r.min_margin_rate, 0)) / 100.0),
                        ceil(s.supply_price * 100.0 / greatest(100 - coalesce(s.reseller_rate, 0), 1)))::bigint,
               p_base)
    from public.mall_builder_product_supply s
    join public.mall_builder_products p on p.id = s.product_id
    left join public.mall_builder_price_rules r on r.store_id = p.store_id
   where s.product_id = p_product
$$;
revoke all on function mall_builder_private.price_floor(uuid, bigint) from public, anon, authenticated;
