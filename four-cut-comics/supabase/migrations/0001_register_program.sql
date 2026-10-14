-- AI 4컷 만화 자동화 (slug: four-cut-comics) — 프로그램 등록 + 요금제 3종 + VIP 등급 접근 (v1.01, 2026-10-14)
-- 카테고리·최소 등급은 portrait-photo와 동일, 배지 new(FREE 아님). 테이블 없음, 키는 공용 user_api_keys(gemini).
-- 설명 본문은 운영 DB 값이 정본(관리자 프로그램 편집 화면). 문장별로 따로 적용했다.
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES ('four-cut-comics','AI 4컷 만화 자동화','주제만 입력하면 대본·캐릭터·컷 그림·대사까지 AI가 만들어 주는 4컷 만화 제작기.','(운영 DB 설명 참고)','https://four-cut-comics.buylife.xyz','v1.01',true,ARRAY['new'],'b5cec438-a6cc-43e5-83bc-59368f8a2c4d','861b7a37-d056-4404-80f5-85edb2e2ebff')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
SELECT p.id, v.name, v.bt, v.price, v.price, true, v.so
FROM public.programs p
CROSS JOIN (VALUES ('1개월','monthly',10000,1), ('2개월','bimonthly',20000,2), ('3개월','quarterly',30000,3)) AS v(name, bt, price, so)
WHERE p.slug = 'four-cut-comics' AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'four-cut-comics'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);
