-- 0092 시나리오 — 운영 번들(0001~0092) 위에서 단독 실행. 결과 줄 앞에 R1~R4.
-- R1 programs 표가 없을 때(Lab): 고정 예약어·플랫폼 주소만 막힘
select 'R1' t, public.mall_builder_is_reserved_slug('admin') admin, public.mall_builder_is_reserved_slug('mall-builder') platform,
       public.mall_builder_is_reserved_slug('dev-mall-builder') dev_platform, public.mall_builder_is_reserved_slug('insta') insta, public.mall_builder_is_reserved_slug('aimaster-b2b') mall;
-- R2 programs 표가 생기면(운영과 같은 모양): 프로그램 slug·하위 도메인 이름도 막힘
create table public.programs (slug text, app_url text);
insert into public.programs values ('insta-auto-poster', 'https://insta.buylife.xyz'), ('shots', 'https://shots.buylife.xyz/'), ('no-url', null), ('vercel-only', 'https://x-y.vercel.app');
select 'R2' t, public.mall_builder_is_reserved_slug('insta') by_subdomain, public.mall_builder_is_reserved_slug('insta-auto-poster') by_slug,
       public.mall_builder_is_reserved_slug('shots') both, public.mall_builder_is_reserved_slug('no-url') no_url_slug,
       public.mall_builder_is_reserved_slug('x-y') vercel_host, public.mall_builder_is_reserved_slug('aimaster-b2b') mall;
-- R3 몰 만들기 함수가 막는지(로그인 사용자로)
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a7', 'a7@x.test');
insert into public.profiles (id, email, is_admin) values ('00000000-0000-0000-0000-0000000000a7', 'a7@x.test', true) on conflict (id) do update set is_admin = true;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a7', false);
set role authenticated;
do $$ begin perform public.mall_builder_create_store('insta', '인스타몰'); raise notice 'R3a — 만들어짐(문제)'; exception when others then raise notice 'R3a 막힘: %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_create_store('mall-builder', '빌더몰'); raise notice 'R3b — 만들어짐(문제)'; exception when others then raise notice 'R3b 막힘: %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_create_store('ok-mall-92', '일반몰'); raise notice 'R3c 만들어짐(정상)'; exception when others then raise notice 'R3c — 막힘(문제): %', sqlerrm; end $$;
reset role;
-- R4 실행 권한(anon도 부를 수 있던 예전과 같은지)
select 'R4' t, has_function_privilege('anon', 'public.mall_builder_is_reserved_slug(text)', 'execute') anon_exec,
       has_function_privilege('authenticated', 'public.mall_builder_is_reserved_slug(text)', 'execute') auth_exec;
