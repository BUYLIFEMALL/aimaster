-- ==============================================================================
-- YOUTUBE CHANNEL CONSULTANT v1.01 프로그램 등록 및 기본 요금제
-- (2026-10-11) 공유 DB programs / pricing_plans 에 등록한다. 새 테이블은 만들지 않는다.
--  - 카테고리: 영상/유튜브 (cb3c7c75-da5e-4474-a185-f069a6dcbda9)
--  - 최소 등급: 일반 (861b7a37-d056-4404-80f5-85edb2e2ebff) — FREE 배지 없음(유료/승인제)
--  - 요금제: 플랫폼 표준 1개월 1만 / 2개월 2만 / 3개월 3만 원
--  - 썸네일: 전용 이미지 제작 전까지 YOUTUBE VIRAL FINDER 썸네일을 임시로 사용
-- ==============================================================================

INSERT INTO public.programs (
  slug, name, short_desc, description, app_url, version, is_active, badges,
  thumbnail_url, category_id, required_grade_id
)
VALUES (
  'youtube-channel-consultant',
  'YOUTUBE CHANNEL CONSULTANT',
  '유튜브 채널 지표 진단과 키워드 검색 결과 분석으로 성장 인사이트를 찾는 채널 컨설턴트',
  '채널 이름·@핸들·주소를 입력하면 구독자·조회수·업로드 주기와 최근 영상별 인기 점수, 쇼츠/일반 영상 비율을 진단하고, 키워드를 입력하면 검색된 영상의 조회수·좋아요·댓글, 채널 점유율, 영상 게시 시기를 분석합니다. 결과는 JSON·CSV로 내보낼 수 있으며, 모든 조회는 회원 본인의 YouTube Data API 키로 이루어집니다.',
  'https://youtube-channel-consultant.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new']::text[],
  'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/youtube-viral-studio-thumbnail.jpg?v=1791641119708',
  'cb3c7c75-da5e-4474-a185-f069a6dcbda9',
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
  SELECT id INTO v_program_id FROM public.programs WHERE slug = 'youtube-channel-consultant';

  IF v_program_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.pricing_plans WHERE program_id = v_program_id) THEN
    INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
    VALUES
      (v_program_id, '1개월', 'monthly', 10000, 10000, true, 1),
      (v_program_id, '2개월', 'bimonthly', 20000, 20000, true, 2),
      (v_program_id, '3개월', 'quarterly', 30000, 30000, true, 3);
  END IF;
END $$;
