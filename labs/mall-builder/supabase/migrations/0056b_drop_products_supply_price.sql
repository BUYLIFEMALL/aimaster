-- AI 쇼핑몰 빌더 — 쓰지 않는 상품 표 칸 supply_price 지우기(주인님 2026-11-11 「승인할테니 순서대로 진행해」)
-- D35(0054)에서 넣었다가 손님이 API로 읽을 수 있어 0054b에서 별도 표(mall_builder_product_supply)로 옮김. 값이 든 줄 0개 확인.
-- 이 칸을 쓰던 곳은 보호 트리거 하나 → 먼저 트리거에서 빼고 칸을 지운다. AIMaster_dev에만.
create or replace function public.mall_builder_products_supplier_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.supplier_id is not null or new.approval <> 'approved' then
        raise exception '공급사 상품은 공급사 화면에서만 올릴 수 있습니다.';
      end if;
    elsif new.supplier_id is distinct from old.supplier_id
       or new.approval is distinct from old.approval or new.approval_note is distinct from old.approval_note then
      raise exception '공급사·승인 상태는 승인 화면에서만 바꿀 수 있습니다.';
    end if;
  end if;
  return new;
end;
$$;
alter table public.mall_builder_products drop column if exists supply_price;
