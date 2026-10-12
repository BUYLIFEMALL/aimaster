-- 시네마틱 스토리보드 자동화(cinematic-storyboard-studio) v1.01 프로그램 등록 (2026-10-13).
--  - 참고 원본: cinematic-storyboard-ai.vercel.app (HTML·번들 전체 분석, 흐름·규칙을 참고해 직접 새로 구현, 프롬프트·문구는 새로 작성)
--  - 카테고리: 멀티미디어, 최소 등급: 일반, FREE+new 배지(회원 본인 Gemini 키로 동작, 운영자 AI 비용 없음. 저장소 사용은 사용자당 프로젝트 30개로 제한)
--  - 요금제: 플랫폼 표준 1·2·3개월 (FREE 배지를 뗄 때를 대비해 함께 등록)
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'cinematic-storyboard-studio',
  '시네마틱 스토리보드 자동화',
  '이미지 한 장으로 영화 같은 9컷 스토리보드와 영상 생성용 프롬프트를 만드는 도구',
  '레퍼런스 이미지 한 장을 올리면 AI가 구도·조명·피사체를 분석해 테마와 4단계 감정선, 키프레임 9컷을 설계하고, 9컷이 한 장에 담긴 마스터 콘택트 시트를 그려 줍니다. 3×3 경계를 슬라이더로 맞춰 컷별 JPG를 ZIP으로 받을 수 있고, 영상 길이(5·8·10·15초)와 대사 언어를 골라 Runway·Kling·Luma·Veo·Sora 같은 영상 AI에 붙여 넣을 마스터 프롬프트·장면별 프롬프트·JSON을 만듭니다. 만든 프로젝트는 내 계정에 저장됩니다(최대 30개). 한국어·English 지원, 회원 본인의 Google Gemini API 키로 동작합니다.',
  'https://cinematic-storyboard-studio.buylife.xyz',
  'v1.01',
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
WHERE p.slug = 'cinematic-storyboard-studio'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);
