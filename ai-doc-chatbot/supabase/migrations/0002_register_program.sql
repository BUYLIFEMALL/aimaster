-- 2026-10-19 메인 사이트 프로그램 등록 (운영 DB esgxyikcnnvmlhygjkth, REST API로 적용)
-- programs 1건(slug ai-doc-chatbot, v1.01, 카테고리 Tools, 최소 등급 일반, 배지 new,
--   app_url https://ai-doc-chatbot.buylife.xyz, sort_order 136, 설명·detail_sections 포함)
-- pricing_plans 3건: 1개월 10,000 / 2개월 20,000 / 3개월 30,000
-- grade_program_access: VIP(드림AI팀) can_access=true → 트리거로 VIP 141명 자동 부여(가입일+1년)
-- 아래는 같은 내용을 SQL로 다시 적용할 때의 형태(설명 본문은 program.json과 동일, 여기서는 생략)
insert into public.programs (category_id, name, slug, short_desc, is_active, sort_order, required_grade_id, app_url, badges, version)
values ('729e7dd9-571e-4f2b-adb8-0ff941edbea1', 'AI 문서 챗봇 자동화', 'ai-doc-chatbot',
        '내 문서에서 근거를 찾고 최신 정보는 웹까지 검색해 출처와 함께 답하는 나만의 AI 문서 챗봇',
        true, 136, '861b7a37-d056-4404-80f5-85edb2e2ebff', 'https://ai-doc-chatbot.buylife.xyz', '{new}', 'v1.01')
on conflict (slug) do nothing;
insert into public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.bt, v.price, v.price, true, v.so from public.programs p,
  (values ('1개월','monthly',10000,0),('2개월','bimonthly',20000,1),('3개월','quarterly',30000,2)) as v(name,bt,price,so)
where p.slug = 'ai-doc-chatbot';
insert into public.grade_program_access (grade_id, program_id, can_access)
select '15db05de-0d6b-4f95-8b02-069991736676', id, true from public.programs where slug = 'ai-doc-chatbot';
