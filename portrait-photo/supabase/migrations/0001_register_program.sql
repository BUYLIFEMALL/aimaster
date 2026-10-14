-- AI 인물사진 자동화 (slug: portrait-photo) — 프로그램 등록 + 요금제 3종 + VIP 등급 접근 (v1.01, 2026-10-14)
-- 카테고리 이미지, 최소 등급 일반, 배지 new(FREE 아님). 테이블 없음, 키는 공용 user_api_keys(gemini).
-- 주의: Supabase MCP execute_sql은 여러 문장을 한 번에 보내면 거부될 수 있어 문장별로 적용했다.

INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'portrait-photo',
  'AI 인물사진 자동화',
  '사진 한 장으로 증명사진·비즈니스 프로필·SNS·시네마틱 화보 인물 사진을 만들고 순백 배경·413×531 규격까지 저장하는 AI 인물사진 스튜디오',
  '인물 사진 1장을 올리고 촬영 목적(증명사진·이력서, 비즈니스·링크드인 프로필, SNS 감성 프로필, 시네마틱 화보, 자유 커스텀)을 고르면 비율·조명·배경·복장·포즈·필름 룩이 한 번에 맞춰지고, 회원 본인의 Google Gemini API 키로 인물 사진을 생성합니다. 조명 6종, 카메라 4종, 배경 19종, 포즈 18종, 복장 12종, 피부 질감 10종, 필름 5종, 이미지 비율 9종을 직접 조합할 수 있고, 입꼬리·어깨·잔머리·눈높이를 자연스럽게 다듬는 보정 4종, 셀카 좌우 방향 보정, 증명사진 가이드선, 배경 순백 정리, 413×531px(250KB 이하) 증명사진 저장, 밝기·노출·대비 조정을 지원합니다. 사진과 결과는 서버에 저장하지 않고 이 브라우저(최근 20장)에만 보관됩니다. 공식 서류는 AI 생성·보정 사진을 받지 않을 수 있으며 통과를 보장하지 않습니다. 본인 또는 동의받은 사진만 사용할 수 있습니다.',
  'https://portrait-photo.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new'],
  'b5cec438-a6cc-43e5-83bc-59368f8a2c4d',
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
WHERE p.slug = 'portrait-photo'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'portrait-photo'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);

-- 썸네일은 scripts/generate-program-thumbnail.mjs(§13 실사 16:9)로 생성해 program-images 버킷에 올리고 programs.thumbnail_url을 직접 갱신한다.
