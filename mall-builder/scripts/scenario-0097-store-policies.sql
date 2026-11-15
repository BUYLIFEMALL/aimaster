-- 0097 몰 약관 시나리오(로컬 Docker 전용). 운영 번들 → 0061 시나리오(본사 hq-mall·분양몰 my-shop) 뒤에 같은 시험 DB에서 psql -f. 결과 줄 앞에 L1~L6.
\set ON_ERROR_STOP 1
-- L1 본사 대표가 저장
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select 'L1' t, public.mall_builder_policy_save('00000000-0000-0000-0000-00000000005a', 'terms', '  본사 약관 본문  ') is not null as saved;
select 'L1b' t, body, updated_by = '00000000-0000-0000-0000-0000000000a1' by_owner from public.mall_builder_store_policies where store_id='00000000-0000-0000-0000-00000000005a' and kind='terms';
-- L2 다시 저장하면 덮어씀(행 하나)
select public.mall_builder_policy_save('00000000-0000-0000-0000-00000000005a', 'terms', '고친 약관');
select 'L2' t, count(*) rows, max(body) body from public.mall_builder_store_policies where store_id='00000000-0000-0000-0000-00000000005a' and kind='terms';
-- L3 분양몰 대표는 저장할 수 없음
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
do $$ begin perform public.mall_builder_policy_save((select id from public.mall_builder_stores where slug='my-shop'), 'terms', '분양자 약관'); raise notice 'L3 통과됨(문제)'; exception when others then raise notice 'L3 막힘: %', sqlerrm; end $$;
-- L4 남의 몰(본사)도 저장할 수 없음
do $$ begin perform public.mall_builder_policy_save('00000000-0000-0000-0000-00000000005a', 'privacy', '남의 몰'); raise notice 'L4 통과됨(문제)'; exception when others then raise notice 'L4 막힘: %', sqlerrm; end $$;
-- L5 종류·길이 검사
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
do $$ begin perform public.mall_builder_policy_save('00000000-0000-0000-0000-00000000005a', 'refund', 'x'); raise notice 'L5a 통과됨(문제)'; exception when others then raise notice 'L5a 막힘: %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_policy_save('00000000-0000-0000-0000-00000000005a', 'privacy', repeat('가', 60001)); raise notice 'L5b 통과됨(문제)'; exception when others then raise notice 'L5b 막힘: %', sqlerrm; end $$;
-- L6 권한: 누구나 읽기, 실행은 로그인만, 표 직접 쓰기 규칙 없음
select 'L6' t, has_function_privilege('anon', 'public.mall_builder_policy_save(uuid,text,text)', 'execute') anon_exec,
  has_function_privilege('authenticated', 'public.mall_builder_policy_save(uuid,text,text)', 'execute') auth_exec,
  (select count(*) from pg_policies where tablename='mall_builder_store_policies') policies,
  (select string_agg(cmd, ',') from pg_policies where tablename='mall_builder_store_policies') cmds;
