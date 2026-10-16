-- AI 쇼츠 원스톱 제작 자동화(shorts-onestop-studio) 프로그램 등록 — 2026-10-16 P1
-- 개발 중: badges=['coming'](준비중 표시). 권한 판정상 is_active=false면 관리자·시험 계정도 들어갈 수 없어 활성으로 등록하고,
-- 등급 자동 부여(grade_program_access)는 개발이 끝날 때까지 넣지 않는다 → 관리자와 시험 계정(buylifemall@naver.com)만 사용.
-- 카테고리는 유튜브(auto-shorts-posting과 같은 분류), 최소 등급은 일반(blog-workroom과 같은 값).
insert into public.programs(name,slug,short_desc,description,category_id,required_grade_id,is_active,sort_order,app_url,badges,version)
select 'AI 쇼츠 원스톱 제작 자동화','shorts-onestop-studio',
'주제 한 줄로 대본·배경·음성·자막·음악을 만들어 세로 쇼츠 MP4로 완성합니다.',
$desc$<p>🎬 <strong>주제 한 줄로 대본·배경·음성·자막·음악을 자동으로 만들어 세로 쇼츠 MP4로 완성하는 제작 도구입니다. 지금은 단계별로 순서대로 공개하고 있습니다.</strong></p><p>🔑 회원 본인의 AI API 키(Gemini·OpenAI·Claude 중 하나 이상)를 등록해 사용합니다. 각 공급사의 요금과 사용 한도는 본인 계정에 적용됩니다.</p>$desc$,
s.category_id, w.required_grade_id, true, (select coalesce(max(sort_order),0)+1 from public.programs),
'https://shorts-onestop-studio.buylife.xyz', array['coming'], 'v1.01'
from public.programs s, public.programs w
where s.slug='auto-shorts-posting' and w.slug='blog-workroom'
  and not exists (select 1 from public.programs where slug='shorts-onestop-studio');

-- 기본 요금제 3종(1·2·3개월 1만/2만/3만원)
insert into public.pricing_plans(program_id,name,billing_type,price,original_price,is_active,sort_order)
select p.id,v.name,v.billing_type,v.price,v.price,true,v.sort_order
from public.programs p cross join (values('1개월','monthly',10000,0),('2개월','bimonthly',20000,1),('3개월','quarterly',30000,2))v(name,billing_type,price,sort_order)
where p.slug='shorts-onestop-studio'
  and not exists (select 1 from public.pricing_plans pp where pp.program_id=p.id);

-- 시험 계정(일반 회원 권한) 사용기간: blog-workroom에 부여된 기간을 그대로 복사
insert into public.user_program_access(user_id,program_id,expires_at)
select a.user_id,p.id,a.expires_at
from public.user_program_access a
join public.programs old on old.id=a.program_id
join auth.users u on u.id=a.user_id
cross join public.programs p
where old.slug='blog-workroom' and p.slug='shorts-onestop-studio' and u.email='buylifemall@naver.com'
  and (a.expires_at is null or a.expires_at>now())
on conflict(user_id,program_id) do nothing;
