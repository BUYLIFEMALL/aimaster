-- AI 쇼핑몰 빌더 M4-C2 — 리셀러 상품 고르기용 「상품별 내 리워드율」 (2026-11-15 마스터 플랜 §4 M4-C2)
-- 손님 권한으로는 공급사 상품 리셀러율(product_supply)·본사 상품율·중복 차단을 다 읽을 수 없으므로,
-- 이 몰의 「활동 중 리셀러 본인」만 부를 수 있는 함수로 상품별 율(리워드 계산 0076 reward_make와 같은 규칙)을 돌려준다.
-- 함수 추가만(drop 없음).

create or replace function public.mall_builder_reseller_product_rates(p_store_id uuid)
returns table (product_id uuid, product_rate numeric, my_rate numeric, total_rate numeric)
language plpgsql stable security definer set search_path = '' as $$
declare r public.mall_builder_resellers%rowtype;
begin
  select rs.* into r from public.mall_builder_resellers rs join public.mall_builder_store_customers c on c.id = rs.customer_id
   where rs.store_id = p_store_id and c.user_id = auth.uid() and rs.active;
  if r.id is null then raise exception '활동 중인 리셀러만 볼 수 있습니다.'; end if;
  return query
    select p.id,
           x.prate,
           x.rrate,
           x.prate + x.rrate
      from public.mall_builder_products p
      left join public.mall_builder_product_supply ps on ps.product_id = p.id
      cross join lateral (select case when ps.product_id is not null then coalesce(ps.reseller_rate, 0) else coalesce(p.reward_rate, 0) end as prate,
                                 case when coalesce(p.reward_no_extra, false) then 0 else r.rate end as rrate) x
     where p.store_id = p_store_id and p.status = 'on_sale';
end;
$$;
revoke all on function public.mall_builder_reseller_product_rates(uuid) from public, anon;
grant execute on function public.mall_builder_reseller_product_rates(uuid) to authenticated;
