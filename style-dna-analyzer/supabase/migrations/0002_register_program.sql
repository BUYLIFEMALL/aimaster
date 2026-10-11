-- STYLE DNA ANALYZER v1.01 프로그램 등록 및 표준 요금제 (2026-10-11).
--  - 카테고리: 멀티미디어 (d9fdfd64-8354-4a45-8b03-d5251831c0d8)
--  - 최소 등급: 일반 (861b7a37-d056-4404-80f5-85edb2e2ebff), FREE 배지 없음(유료/승인제)
--  - 요금제: 플랫폼 표준 1개월 1만 / 2개월 2만 / 3개월 3만 원
--  - 썸네일: 전용 실사 썸네일 제작 전까지 비워 둔다

INSERT INTO public.programs (
  slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id
)
VALUES (
  'style-dna-analyzer',
  'STYLE DNA ANALYZER',
  '이미지 한 장의 카메라·조명·색감·스타일을 분석해 그대로 재현하거나 변형할 수 있는 마스터 프롬프트로 만들어 주는 스타일 DNA 분석기',
  '이미지를 올리면 AI가 카메라(앵글·샷·렌즈·초점·심도)와 조명(시간대·방향·고도·대비·그림자), 실제 색상 팔레트, 스타일 DNA를 분석하고 영어·한국어 마스터 프롬프트를 만들어 줍니다. 「유전자 복제」는 스타일을 그대로 재현하고 「유전자 변이」는 지침에 따라 변형합니다. 피드백으로 프롬프트를 미세 보정하고, 피사체를 넣어 실제로 이미지를 생성해 원본과 색감 일치율까지 확인할 수 있으며, 분석 결과는 보관함에 저장됩니다. 모든 AI 호출은 회원 본인의 Gemini·OpenAI·Claude 키로 이루어집니다.',
  'https://style-dna-analyzer.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new']::text[],
  'd9fdfd64-8354-4a45-8b03-d5251831c0d8',
  '861b7a37-d056-4404-80f5-85edb2e2ebff'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_desc = EXCLUDED.short_desc,
  description = EXCLUDED.description,
  app_url = EXCLUDED.app_url,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active,
  badges = EXCLUDED.badges,
  category_id = EXCLUDED.category_id,
  required_grade_id = EXCLUDED.required_grade_id,
  updated_at = NOW();

DO $$
DECLARE
  v_program_id UUID;
BEGIN
  SELECT id INTO v_program_id FROM public.programs WHERE slug = 'style-dna-analyzer';

  IF v_program_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.pricing_plans WHERE program_id = v_program_id) THEN
    INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
    VALUES
      (v_program_id, '1개월', 'monthly', 10000, 10000, true, 1),
      (v_program_id, '2개월', 'bimonthly', 20000, 20000, true, 2),
      (v_program_id, '3개월', 'quarterly', 30000, 30000, true, 3);
  END IF;
END $$;
