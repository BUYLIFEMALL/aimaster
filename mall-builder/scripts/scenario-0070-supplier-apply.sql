-- 0070 공급사 입점 신청 시나리오(로컬 Docker 전용). 흉내 틀 + 묶음 적용 뒤 psql -f
-- 대표 a1, 신청자 b2, 다른 사람 e9, 몰 5a
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000b2','new@x.test'),('00000000-0000-0000-0000-0000000000e9','other@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000b2','new@x.test'),('00000000-0000-0000-0000-0000000000e9','other@x.test');
insert into mall_builder_stores (id, name, owner_id, slug, status) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','scn','active');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner');
\set cert '00000000-0000-0000-0000-00000000005a/00000000-0000-0000-0000-0000000000b2/supplier-apply-1.pdf'
-- 1 신청 안 받는 몰 → 거절
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2', false), set_config('request.jwt.claims','{"email":"new@x.test"}', false);
do $$ begin perform mall_builder_supplier_apply('00000000-0000-0000-0000-00000000005a', '{"company":"가나상사","biz_no":"123-45-67890","cert_path":"00000000-0000-0000-0000-00000000005a/00000000-0000-0000-0000-0000000000b2/supplier-apply-1.pdf"}'); raise notice '1 받지 않는 몰 — 통과됨(문제)'; exception when others then raise notice '1 막힘: %', sqlerrm; end $$;
-- 2 대표가 켬
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select mall_builder_supplier_apply_open('00000000-0000-0000-0000-00000000005a', true);
-- 3 서류 경로 위조(남의 폴더) → 거절, 정상 신청 → 성공, 중복 → 거절
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2', false);
do $$ begin perform mall_builder_supplier_apply('00000000-0000-0000-0000-00000000005a', '{"company":"가나상사","biz_no":"1234567890","cert_path":"00000000-0000-0000-0000-00000000005a/00000000-0000-0000-0000-0000000000e9/supplier-apply-1.pdf"}'); raise notice '3a 남의 서류 — 통과됨(문제)'; exception when others then raise notice '3a 막힘: %', sqlerrm; end $$;
select mall_builder_supplier_apply('00000000-0000-0000-0000-00000000005a', jsonb_build_object('company','가나상사','biz_no','123-45-67890','ceo_name','홍길동','phone','010-1111-2222','category','생활용품','intro','욕실용품 제조','cert_path',:'cert')) as app \gset
do $$ begin perform mall_builder_supplier_apply('00000000-0000-0000-0000-00000000005a', '{"company":"가나상사","biz_no":"1234567890","cert_path":"00000000-0000-0000-0000-00000000005a/00000000-0000-0000-0000-0000000000b2/supplier-apply-2.pdf"}'); raise notice '3c 중복 — 통과됨(문제)'; exception when others then raise notice '3c 막힘: %', sqlerrm; end $$;
select '3 신청' t, company, biz_no, status from mall_builder_supplier_applications;
-- 4 다른 사람·신청자 본인은 승인 못 함
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e9', false);
do $$ begin perform mall_builder_supplier_apply_decide((select id from mall_builder_supplier_applications limit 1), 'approve', '', 5); raise notice '4 다른 사람 승인 — 통과됨(문제)'; exception when others then raise notice '4 막힘: %', sqlerrm; end $$;
-- 5 대표: 사유 없는 반려 막힘 → 승인(본사율 5%)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
do $$ begin perform mall_builder_supplier_apply_decide((select id from mall_builder_supplier_applications limit 1), 'reject', '', null); raise notice '5a 사유 없는 반려 — 통과됨(문제)'; exception when others then raise notice '5a 막힘: %', sqlerrm; end $$;
select '5 승인' t, mall_builder_supplier_apply_decide(:'app', 'approve', '환영합니다', 5) is not null ok;
select '6 공급사' t, name, email, biz_no, status, hq_fee_rate, user_id = '00000000-0000-0000-0000-0000000000b2' linked from mall_builder_suppliers;
select '7 신청 상태' t, status, note, supplier_id is not null from mall_builder_supplier_applications;
-- 8 공급사가 됐으니 공급사 번호가 나옴
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2', false);
select '8 내 공급사 번호' t, mall_builder_my_supplier_id('00000000-0000-0000-0000-00000000005a') is not null ok;
