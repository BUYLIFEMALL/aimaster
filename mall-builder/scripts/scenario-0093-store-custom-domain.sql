-- 0093 시나리오 — 운영 번들(0001~0093) 위에서 단독 실행. 결과 줄 앞에 D1~D6.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'd1@x.test'), ('00000000-0000-0000-0000-0000000000d2', 'd2@x.test');
insert into public.profiles (id, email, is_admin) values ('00000000-0000-0000-0000-0000000000d1', 'd1@x.test', true), ('00000000-0000-0000-0000-0000000000d2', 'd2@x.test', true)
  on conflict (id) do update set is_admin = true;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', false);
set role authenticated;
select public.mall_builder_create_store('dom-a', '도메인몰A') is not null as made_a;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', false);
set role authenticated;
select public.mall_builder_create_store('dom-b', '도메인몰B') is not null as made_b;
reset role;
select set_config('mb.a', (select id::text from public.mall_builder_stores where slug='dom-a'), false), set_config('mb.b', (select id::text from public.mall_builder_stores where slug='dom-b'), false);
-- D1 대표가 저장: 정리(대문자·https·경로·끝 점) 뒤 저장
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', false);
set role authenticated;
select 'D1' t, public.mall_builder_set_custom_domain(current_setting('mb.a')::uuid, ' HTTPS://Shop.MyMall.co.kr/abc ') saved;
-- D2 막힘: buylife.xyz, vercel.app, 형식 틀림
do $$ begin perform public.mall_builder_set_custom_domain(current_setting('mb.a')::uuid, 'x.buylife.xyz'); raise notice 'D2a — 저장됨(문제)'; exception when others then raise notice 'D2a 막힘: %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_set_custom_domain(current_setting('mb.a')::uuid, 'a.vercel.app'); raise notice 'D2b — 저장됨(문제)'; exception when others then raise notice 'D2b 막힘: %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_set_custom_domain(current_setting('mb.a')::uuid, 'no_dot'); raise notice 'D2c — 저장됨(문제)'; exception when others then raise notice 'D2c 막힘: %', sqlerrm; end $$;
-- D3 남의 몰은 못 바꿈
do $$ begin perform public.mall_builder_set_custom_domain(current_setting('mb.b')::uuid, 'evil.com'); raise notice 'D3 — 저장됨(문제)'; exception when others then raise notice 'D3 막힘: %', sqlerrm; end $$;
reset role;
-- D4 중복: B 대표가 A의 도메인을 넣으면 막힘
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', false);
set role authenticated;
do $$ begin perform public.mall_builder_set_custom_domain(current_setting('mb.b')::uuid, 'shop.mymall.co.kr'); raise notice 'D4 — 저장됨(문제)'; exception when others then raise notice 'D4 막힘: %', sqlerrm; end $$;
reset role;
-- D5 공개 찾기(anon): 몰 이름만, 없는 주소는 null
set role anon;
select 'D5' t, public.mall_builder_slug_by_domain('shop.mymall.co.kr') found, public.mall_builder_slug_by_domain('SHOP.MYMALL.CO.KR') upper, public.mall_builder_slug_by_domain('none.com') missing;
reset role;
-- D6 지우기 + 권한
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', false);
set role authenticated;
select 'D6' t, public.mall_builder_set_custom_domain(current_setting('mb.a')::uuid, '') cleared;
reset role;
select 'D6' t, (select custom_domain from public.mall_builder_stores where slug='dom-a') after_clear,
       has_function_privilege('anon', 'public.mall_builder_set_custom_domain(uuid,text)', 'execute') anon_set,
       has_function_privilege('anon', 'public.mall_builder_slug_by_domain(text)', 'execute') anon_find;
