-- T1 보강: 같은 몰 안에서 등급 이름 중복 금지(2026-11-12 화면 시험 중 「도매상(시험)」이 두 번 생긴 것을 발견)
create or replace function public.mall_builder_grade_save(p_store_id uuid, p_id uuid, p_name text, p_is_business boolean, p_rank int, p_default_rate int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare g public.mall_builder_customer_grades%rowtype; v_name text := btrim(coalesce(p_name, '')); v_id uuid;
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'customers') then raise exception '등급 관리는 손님 권한이 있는 운영자만 할 수 있습니다.'; end if;
  if char_length(v_name) not between 1 and 20 then raise exception '등급 이름을 1~20자로 적어 주세요.'; end if;
  if p_rank is null or p_rank not between 0 and 1000 then raise exception '순서는 0~1000 사이 숫자로 적어 주세요.'; end if;
  if p_default_rate is null or p_default_rate not between 0 and 90 then raise exception '기본 할인율은 0~90%% 사이로 적어 주세요.'; end if;
  if exists (select 1 from public.mall_builder_customer_grades x where x.store_id = p_store_id and lower(x.name) = lower(v_name) and x.id is distinct from p_id) then raise exception '같은 이름의 등급이 이미 있습니다. 다른 이름을 적어 주세요.'; end if;
  if p_id is null then
    if (select count(*) from public.mall_builder_customer_grades x where x.store_id = p_store_id) >= 20 then raise exception '등급은 20개까지 만들 수 있습니다.'; end if;
    insert into public.mall_builder_customer_grades (store_id, code, name, rank, is_business, default_discount_rate)
    values (p_store_id, case when p_is_business then 'biz_' else 'cons_' end || substr(md5(gen_random_uuid()::text), 1, 8), v_name, p_rank, coalesce(p_is_business, false), p_default_rate)
    returning id into v_id;
    return v_id;
  end if;
  select * into g from public.mall_builder_customer_grades x where x.id = p_id and x.store_id = p_store_id for update;
  if g.id is null then raise exception '등급을 찾을 수 없습니다.'; end if;
  if coalesce(p_is_business, g.is_business) <> g.is_business then
    if g.code in ('consumer', 'business') then raise exception '기본 등급(일반·사업자)은 소비자/사업자 구분을 바꿀 수 없습니다.'; end if;
    if exists (select 1 from public.mall_builder_store_customers c where c.grade_id = g.id) then raise exception '이 등급을 쓰는 손님이 있어 소비자/사업자 구분을 바꿀 수 없습니다.'; end if;
  end if;
  update public.mall_builder_customer_grades set name = v_name, rank = p_rank, is_business = coalesce(p_is_business, g.is_business), default_discount_rate = p_default_rate where id = g.id;
  return g.id;
end;
$$;
