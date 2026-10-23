-- 페르소나 문체 자동화(persona-style-studio) v1.01 프로그램 등록 (2026-10-13).
--  - 참고 원본: prompt-equalizer.vercel.app (구조·동작만 분석해 새로 구현, 문구·데이터는 새로 작성)
--  - 카테고리: Tools, 최소 등급: 일반, FREE+new 배지(회원 본인 Gemini 키로 동작해 운영자 비용 없음 → 프리미엄 후보 아님)
--  - 요금제: 플랫폼 표준 1·2·3개월 (FREE 배지를 뗄 때를 대비해 함께 등록)
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'persona-style-studio',
  '페르소나 문체 자동화',
  '슬라이더 이퀄라이저와 캐릭터 페르소나로 글의 문체를 다시 써 주는 글쓰기 도구',
  '글을 넣고 창의성·명확성·감정 깊이·길이·전문성 5개 슬라이더(또는 프리셋 8종)로 문체의 맛을 조절하면 AI가 그 설정대로 글을 다시 써 줍니다. 기본 캐릭터 페르소나 10명(기사단장, 해커, 탐정, 편집장 등)을 고르거나 이름과 역할만 넣어 AI로 상세 설정을 자동 생성해 나만의 페르소나를 만들 수 있고, 페르소나와 초안은 내 계정에 저장됩니다. 한국어·English 지원. 회원 본인의 Google Gemini API 키로 동작합니다.',
  'https://persona-style-studio.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new','free']::text[],
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
WHERE p.slug = 'persona-style-studio'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);
