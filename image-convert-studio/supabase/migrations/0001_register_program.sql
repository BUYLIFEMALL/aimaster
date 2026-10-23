-- IMAGE CONVERT STUDIO v1.02(v1.01 등록 후 pica 업스케일 멈춤 수정으로 v1.02) 프로그램 등록 (2026-10-12).
--  - 참고 원본: imagic-ochre.vercel.app (이미지 변환·업스케일·콜라주, 브라우저 안에서만 처리)
--  - 카테고리: 멀티미디어, 최소 등급: 일반, FREE 배지(API 키·서버 비용이 없어 가입 회원 누구나 사용)
--  - 요금제: 플랫폼 표준 1·2·3개월 (FREE 배지를 뗄 때를 대비해 함께 등록)
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'image-convert-studio',
  '이미지 변환 스튜디오',
  '여러 이미지를 WebP·PNG·JPEG·AVIF로 일괄 변환하고, 고품질로 확대·축소하며, 콜라주로 합치는 도구',
  '이미지를 여러 장 올려 WebP·PNG·JPEG·AVIF로 한 번에 변환하고, Lanczos 계열 보간으로 0.5배~4배 확대·축소하며(선명도 보정 포함), 최대 너비·높이로 크기를 제한하고, 완료한 결과를 ZIP으로 받습니다. 여러 장을 격자·가로·세로 레이아웃의 한 장 콜라주로 합칠 수도 있습니다. 모든 처리는 브라우저 안에서만 이뤄져 이미지가 서버로 전송되지 않고, API 키도 필요 없습니다. 한국어·English를 지원합니다.',
  'https://image-convert-studio.buylife.xyz',
  'v1.04',
  true,
  ARRAY['new','free']::text[],
  'd9fdfd64-8354-4a45-8b03-d5251831c0d8',
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
WHERE p.slug = 'image-convert-studio'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);
