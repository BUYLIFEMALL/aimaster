-- ==============================================================================
-- YouTube Viral Studio (골든 파인더 엔진) v1.01 프로그램 등록 및 요금제 마이그레이션
-- ==============================================================================

-- 1. programs 테이블 등록 (이미 존재하는 경우 업데이트)
INSERT INTO public.programs (
  slug,
  name,
  short_desc,
  description,
  app_url,
  version,
  is_active,
  badges,
  thumbnail_url
)
VALUES (
  'youtube-viral-studio',
  'YouTube Viral Studio (골든 파인더)',
  '소형 채널 떡상 쇼츠 발굴, 황금 채널 스크리닝, 실시간 VPH 급상승 영상 랭킹 및 롱폼 원본 역추적',
  '구독자 1만명 이하 소형 채널에서 터진 떡상 쇼츠 발굴, 영상당 수십만 회 급성장 황금 채널 스크리닝, 시간당 조회수 속도(VPH) 랭킹 및 쇼츠 원본 역추적까지 지원하는 유튜브 벤치마킹 전문 스튜디오입니다.',
  'https://youtube-viral-studio.vercel.app',
  'v1.01',
  true,
  ARRAY['free', 'new']::text[],
  'https://www.buylife.xyz/thumbnails/youtube-viral-studio.png'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_desc = EXCLUDED.short_desc,
  description = EXCLUDED.description,
  app_url = EXCLUDED.app_url,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active,
  badges = EXCLUDED.badges,
  updated_at = NOW();

-- 2. pricing_plans 기본 3단계 요금제 등록
DO $$
DECLARE
  v_program_id UUID;
BEGIN
  SELECT id INTO v_program_id FROM public.programs WHERE slug = 'youtube-viral-studio';

  IF v_program_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.pricing_plans WHERE program_id = v_program_id) THEN
      INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
      VALUES
        (v_program_id, '1개월 이용권', 'monthly', 29000, 39000, true, 1),
        (v_program_id, '2개월 이용권 (할인)', 'bimonthly', 54000, 78000, true, 2),
        (v_program_id, '3개월 이용권 (최대할인)', 'quarterly', 75000, 117000, true, 3);
    END IF;
  END IF;
END $$;
