-- ==============================================================================
-- YouTube Viral Studio (골든 파인더 엔진) v1.01 프로그램 등록 및 요금제 마이그레이션
-- ==============================================================================

-- 1. programs 테이블 등록 (이미 존재하는 경우 업데이트)
INSERT INTO public.programs (
  slug,
  title,
  description,
  app_url,
  version,
  is_active,
  badges,
  icon,
  category,
  sort_order
)
VALUES (
  'youtube-viral-studio',
  'YouTube Viral Studio (골든 파인더)',
  '소형 채널 떡상 쇼츠 발굴, 황금 채널 스크리닝, 실시간 VPH 급상승 영상 랭킹 및 롱폼 원본 역추적',
  'https://youtube-viral-studio.buylife.xyz',
  'v1.01',
  true,
  ARRAY['free', 'hot']::text[],
  'Flame',
  'youtube',
  5
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  app_url = EXCLUDED.app_url,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active,
  badges = EXCLUDED.badges,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 2. pricing_plans 기본 요금제 등록
DO $$
DECLARE
  v_program_id UUID;
BEGIN
  SELECT id INTO v_program_id FROM public.programs WHERE slug = 'youtube-viral-studio';

  IF v_program_id IS NOT NULL THEN
    -- 기존 요금제가 없으면 3단계 요금제 등록
    IF NOT EXISTS (SELECT 1 FROM public.pricing_plans WHERE program_id = v_program_id) THEN
      INSERT INTO public.pricing_plans (program_id, plan_name, plan_type, price_monthly, features, is_active, sort_order)
      VALUES
        (v_program_id, '무료 체험', 'free', 0, '["일일 쇼츠 발굴 20회", "기본 VPH 랭킹", "본인 YouTube API 연동"]'::jsonb, true, 1),
        (v_program_id, '프로 크리에이터', 'pro', 29000, '["무제한 쇼츠 발굴", "황금 채널 무제한 스크리닝", "롱폼 원본 역추적", "CSV 내보내기"]'::jsonb, true, 2),
        (v_program_id, '마스터 스튜디오', 'enterprise', 59000, '["프로 기능 전체", "AI 쇼츠 스크립트 재구성 연동", "채널 모니터링", "우선 지원"]'::jsonb, true, 3);
    END IF;
  END IF;
END $$;
