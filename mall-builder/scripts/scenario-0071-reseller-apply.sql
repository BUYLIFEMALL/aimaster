-- 0071 리셀러 신청·승인 시나리오(로컬 Docker 전용). 흉내 틀 + 묶음 적용 뒤 psql -f
-- 대표 a1, 회원 r1(리셀러 신청), 비회원 r9, 몰 5a
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000f1','r1@x.test'),('00000000-0000-0000-0000-0000000000f9','r9@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000f1','r1@x.test'),('00000000-0000-0000-0000-0000000000f9','r9@x.test');
insert into mall_builder_stores (id, name, owner_id, slug, status) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','scn','active');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone) values ('00000000-0000-0000-0000-0000000000c5','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f1','김리셀','010-3333-4444');
\set book '00000000-0000-0000-0000-00000000005a/00000000-0000-0000-0000-0000000000f1/reseller-apply-1.png'
\set doc '00000000-0000-0000-0000-00000000005a/00000000-0000-0000-0000-0000000000f1/reseller-apply-2.pdf'

-- 1 받지 않는 몰 → 거절, 대표가 켬
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
do $$ begin perform mall_builder_reseller_apply('00000000-0000-0000-0000-00000000005a', '{"name":"김리셀","channel":"blog","payee_type":"individual","bank_name":"국민","bank_account":"123-456","bank_holder":"김리셀","bankbook_path":"00000000-0000-0000-0000-00000000005a/00000000-0000-0000-0000-0000000000f1/reseller-apply-1.png"}'); raise notice '1 받지 않는 몰 — 통과됨(문제)'; exception when others then raise notice '1 막힘: %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select mall_builder_reseller_apply_open('00000000-0000-0000-0000-00000000005a', true);
-- 2 비회원 → 거절
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f9', false);
do $$ begin perform mall_builder_reseller_apply('00000000-0000-0000-0000-00000000005a', '{"name":"남","channel":"blog","payee_type":"individual","bank_name":"국민","bank_account":"123-456","bank_holder":"남","bankbook_path":"x"}'); raise notice '2 비회원 — 통과됨(문제)'; exception when others then raise notice '2 막힘: %', sqlerrm; end $$;
-- 3 사업자인데 사업자등록증 없음 → 거절, 정상 사업자 신청 → 성공
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
do $$ begin perform mall_builder_reseller_apply('00000000-0000-0000-0000-00000000005a', '{"name":"김리셀","channel":"blog","payee_type":"business","biz_no":"1234567890","bank_name":"국민","bank_account":"123-456","bank_holder":"김리셀","bankbook_path":"00000000-0000-0000-0000-00000000005a/00000000-0000-0000-0000-0000000000f1/reseller-apply-1.png"}'); raise notice '3a 사업자 서류 없음 — 통과됨(문제)'; exception when others then raise notice '3a 막힘: %', sqlerrm; end $$;
select mall_builder_reseller_apply('00000000-0000-0000-0000-00000000005a', jsonb_build_object('name','김리셀','phone','010-3333-4444','channel','https://blog.naver.com/kim','intro','육아 블로그','payee_type','business','biz_no','111-22-33333','bank_name','국민','bank_account','123-456-789','bank_holder','김리셀','bankbook_path',:'book','doc_path',:'doc')) as app \gset
select '3 신청' t, name, payee_type, biz_no, status from mall_builder_reseller_applications;
-- 4 사유 없는 반려 막힘 → 승인(추가율 2%)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
do $$ begin perform mall_builder_reseller_apply_decide((select id from mall_builder_reseller_applications limit 1), 'reject', '', null); raise notice '4a 사유 없는 반려 — 통과됨(문제)'; exception when others then raise notice '4a 막힘: %', sqlerrm; end $$;
select '4 승인' t, mall_builder_reseller_apply_decide(:'app', 'approve', '', 2) is not null ok;
select '5 리셀러' t, char_length(code) code_len, rate, active, payee_type, bank_name, bank_holder, approved_at is not null approved from mall_builder_resellers;
-- 6 이미 리셀러면 다시 신청 거절
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
do $$ begin perform mall_builder_reseller_apply('00000000-0000-0000-0000-00000000005a', '{"name":"김리셀","channel":"blog","payee_type":"individual","bank_name":"국민","bank_account":"123-456","bank_holder":"김리셀","bankbook_path":"00000000-0000-0000-0000-00000000005a/00000000-0000-0000-0000-0000000000f1/reseller-apply-3.png"}'); raise notice '6 다시 신청 — 통과됨(문제)'; exception when others then raise notice '6 막힘: %', sqlerrm; end $$;
-- 7 운영자 지정 함수도 0% 허용
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '7 0% 지정' t, mall_builder_reseller_set('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000c5', 'KIMRS1', 0, true) is not null ok,
  (select rate from mall_builder_resellers) rate;
select '7b 0% 확인' t, rate from mall_builder_resellers;
select '8 신청 수' t, count(*) from mall_builder_reseller_applications;
