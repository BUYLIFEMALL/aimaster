-- 0072 리셀러 제휴 링크 → 주문 기록 시나리오(로컬 Docker 전용). 흉내 틀 + 묶음 적용 뒤 psql -f
-- 몰 scn(대표 a1), 리셀러 R1(손님 c1·f1, 코드 RSLR01)·R2(c3·f3, RSLR02)·쉬는 R3(c5·f5, RSLR03), 구매자 c2(f2, 가입 때 R2 연결)·c4(f4, 연결 없음)
\set ON_ERROR_STOP 1
insert into auth.users (id, email) select ('00000000-0000-0000-0000-0000000000' || x)::uuid, x || '@x.test' from unnest(array['a1','f1','f2','f3','f4','f5']) x;
insert into public.profiles (id, email) select ('00000000-0000-0000-0000-0000000000' || x)::uuid, x || '@x.test' from unnest(array['a1','f1','f2','f3','f4','f5']) x;
insert into mall_builder_stores (id, name, owner_id, slug, status) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','scn','active');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone)
select ('00000000-0000-0000-0000-0000000000c' || n)::uuid, '00000000-0000-0000-0000-00000000005a', ('00000000-0000-0000-0000-0000000000f' || n)::uuid, '손님' || n, '010-0000-000' || n from generate_series(1, 5) n;
insert into mall_builder_resellers (id, store_id, customer_id, code, rate, active) values
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c1','RSLR01',5,true),
 ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c3','RSLR02',5,true),
 ('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c5','RSLR03',5,false);
update mall_builder_store_customers set reseller_id = '00000000-0000-0000-0000-0000000000e2' where id = '00000000-0000-0000-0000-0000000000c2';

create temp table o (n int, id uuid);
create or replace function pg_temp.ord(p_n int, p_user text, p_cust text, p_hdr text, p_guest boolean default false) returns uuid language plpgsql as $f$
declare v uuid := gen_random_uuid();
begin
  perform set_config('request.headers', case when p_hdr is null then '{}' else json_build_object('x-mb-ref', p_hdr)::text end, false);
  insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, subtotal, shipping_fee, total, is_guest, guest_name, guest_phone, reseller_id, ref_source)
  values (v, '00000000-0000-0000-0000-00000000005a', p_n, 'T-' || p_n, case when p_user is null then null else ('00000000-0000-0000-0000-0000000000' || p_user)::uuid end,
          case when p_cust is null then null else ('00000000-0000-0000-0000-0000000000' || p_cust)::uuid end, '{"zip":"63100"}', '홍길동', 20000, 3000, 23000, p_guest,
          case when p_guest then '비회원' end, case when p_guest then '010-9999-0000' end,
          '00000000-0000-0000-0000-0000000000e2', 'link'); -- 손님이 넣은 값(무시돼야 함)
  insert into o values (p_n, v);
  return v;
end $f$;

select pg_temp.ord(1, 'f4', 'c4', 'scn=RSLR01');               -- 1 링크
select pg_temp.ord(2, 'f2', 'c2', 'other=X1;scn=rslr01');      -- 2 링크가 가입 연결보다 우선(소문자도)
select pg_temp.ord(3, 'f2', 'c2', null);                        -- 3 링크 없음 → 가입 연결 R2
select pg_temp.ord(4, 'f1', 'c1', 'scn=RSLR01');               -- 4 본인 링크 → 없음
select pg_temp.ord(5, 'f4', 'c4', 'scnx=RSLR01');              -- 5 다른 몰 코드 → 없음
select pg_temp.ord(6, null, null, 'scn=RSLR01', true);          -- 6 비회원 링크
select pg_temp.ord(7, 'f4', 'c4', 'scn=RSLR03');               -- 7 쉬는 리셀러 → 없음
select pg_temp.ord(8, 'f4', 'c4', 'scn=RSLR01;bad');           -- 8 깨진 머리글 뒷부분 무시하고 링크
select o.n, x.ref_code, x.ref_source from o join mall_builder_orders x on x.id = o.id order by o.n;

-- 9 구매 확정 → 적립(링크 주문 1·비회원 6, 가입 연결 3)
update mall_builder_orders set status = 'confirmed' where id in (select id from o where n in (1, 3, 6));
select '9 적립' t, r.code, l.amount, x.order_no from mall_builder_reseller_ledger l join mall_builder_resellers r on r.id = l.reseller_id join mall_builder_orders x on x.id = l.order_id order by x.order_no;

-- 10 손님 권한으로는 주문 리셀러를 못 바꿈
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f4', false);
set role authenticated;
do $$ begin update mall_builder_orders set reseller_id = null, ref_code = 'HACK' where order_no = 'T-1'; exception when others then raise notice '10 막힘: %', sqlerrm; end $$;
reset role;
select '10 그대로' t, ref_code from mall_builder_orders where order_no = 'T-1';
