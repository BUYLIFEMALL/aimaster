-- D33 고침: 가입 트리거는 가입하는 손님 권한으로 돌아 리셀러 표(보안 규칙상 손님에게 안 보임)를 못 읽었다 → 코드 찾기만 security definer 함수로
create or replace function mall_builder_private.reseller_by_code(p_store_id uuid, p_code text)
returns uuid language sql stable security definer set search_path = '' as $$
  select r.id from public.mall_builder_resellers r
   where r.store_id = p_store_id and r.active and r.code = upper(btrim(coalesce(p_code, '')))
$$;

create or replace function public.mall_builder_store_customers_reseller()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then new.reseller_ref := null; return new; end if;
  if tg_op = 'INSERT' then
    new.reseller_id := mall_builder_private.reseller_by_code(new.store_id, new.reseller_ref);
  else
    new.reseller_id := old.reseller_id;
  end if;
  new.reseller_ref := null;
  return new;
end $$;
