-- CARDNEWS STUDIO v1.01 프로그램 등록 및 표준 요금제 (2026-10-11).
--  - 카테고리: 인스타 (69f2b789-3519-456b-bc4c-057788956542)
--  - 최소 등급: 일반 (861b7a37-d056-4404-80f5-85edb2e2ebff), FREE 배지 없음(유료/승인제)
--  - 요금제: 플랫폼 표준 1개월 1만 / 2개월 2만 / 3개월 3만 원
--  - 썸네일: 전용 실사 썸네일 제작 전까지 비워 둔다(scripts/generate-program-thumbnail.mjs 로 등록)

INSERT INTO public.programs (
  slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id
)
VALUES (
  'cardnews-studio',
  'CARDNEWS STUDIO',
  '주제만 넣으면 AI가 페이지별 문구와 배경을 만들고, 글자가 얹힌 카드뉴스를 PNG로 완성하는 카드뉴스 스튜디오',
  '분야와 핵심 주제, 어조(일반·진지·국뽕·유머·넉살), 페이지 수(4·6·8·10장)를 정하면 AI가 페이지별 문구를 쓰고, 화풍(실사·디지털 아트·3D·수채화)과 구성·테마 컬러에 맞춰 배경 이미지를 만든 뒤, 글꼴·배치·표시 효과(그림자·외곽선·형광펜)를 입혀 카드뉴스를 완성합니다. 완성한 카드는 PNG로 저장하고, 프로젝트는 보관함에 저장해 다시 열어 고칠 수 있습니다. 모든 AI 호출은 회원 본인의 Gemini·OpenAI·Claude 키로 이루어집니다.',
  'https://cardnews-studio.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new']::text[],
  '69f2b789-3519-456b-bc4c-057788956542',
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
  SELECT id INTO v_program_id FROM public.programs WHERE slug = 'cardnews-studio';

  IF v_program_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.pricing_plans WHERE program_id = v_program_id) THEN
    INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
    VALUES
      (v_program_id, '1개월', 'monthly', 10000, 10000, true, 1),
      (v_program_id, '2개월', 'bimonthly', 20000, 20000, true, 2),
      (v_program_id, '3개월', 'quarterly', 30000, 30000, true, 3);
  END IF;
END $$;
