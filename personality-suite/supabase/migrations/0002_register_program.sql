-- AI 종합 성격 진단 자동화 (slug: personality-suite) — 프로그램 등록 + 요금제 3종 + VIP 등급 접근 (v1.01, 2026-10-14)
-- 카테고리 Tools, 최소 등급 일반, 배지 new + free(가입한 회원 누구나 사용). AI 분석은 회원 본인 Gemini 키.
-- 주의: Supabase MCP execute_sql은 여러 문장을 한 번에 보내면 거부될 수 있어 문장별로 적용했다.

INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'personality-suite',
  'AI 종합 성격 진단 자동화',
  '16유형 상황별 검사 10종과 성격 5요인·행동 스타일·애착·에니어그램 검사를 하고, 내 Gemini 키로 AI 심층 분석과 종합 프로필을 받는 성격 진단 자동화',
  '일·연애·갈등·학습·여행 같은 상황별 16유형 검사 10종과 성격 5요인, 행동 스타일, 애착 유형, 에니어그램 검사를 한 곳에서 합니다. 한 화면에 한 문항씩 답하면 점수·강점·주의할 점·활용 팁이 바로 나오고, 결과는 본인만 볼 수 있게 보관됩니다. 회원 본인의 Google Gemini API 키로 결과별 AI 심층 분석(강점·성장 조언·잘 맞는 환경·관계 팁)을 받고, 검사를 2종 이상 마치면 여러 결과를 묶은 종합 프로필과 2주 실천 계획을 만들 수 있습니다. 모든 문항과 해석은 새로 작성했으며 재미와 자기 이해를 위한 참고용이고 의학적·심리학적 진단이 아닙니다. 검사와 기본 해석은 AI 키 없이도 사용할 수 있습니다.',
  'https://personality-suite.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new','free'],
  '729e7dd9-571e-4f2b-adb8-0ff941edbea1',
  '861b7a37-d056-4404-80f5-85edb2e2ebff'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, short_desc = EXCLUDED.short_desc, description = EXCLUDED.description,
  app_url = EXCLUDED.app_url, version = EXCLUDED.version, is_active = EXCLUDED.is_active,
  badges = EXCLUDED.badges, category_id = EXCLUDED.category_id, required_grade_id = EXCLUDED.required_grade_id,
  updated_at = NOW();

INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
SELECT p.id, v.name, v.bt, v.price, v.price, true, v.so
FROM public.programs p
CROSS JOIN (VALUES ('1개월','monthly',10000,1), ('2개월','bimonthly',20000,2), ('3개월','quarterly',30000,3)) AS v(name, bt, price, so)
WHERE p.slug = 'personality-suite'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'personality-suite'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);

-- 썸네일은 scripts/generate-program-thumbnail.mjs(§13 실사 16:9)로 생성해 program-images 버킷에 올리고 programs.thumbnail_url을 직접 갱신한다.
