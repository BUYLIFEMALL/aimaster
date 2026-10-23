-- INFINITE LOOP VIDEO v1.01 프로그램 등록 (2026-10-12).
--  - 참고 원본: seamless-loop-studio.vercel.app (구조·알고리즘만 참고해 새로 구현, 브라우저 안에서만 처리)
--  - 카테고리: 멀티미디어, 최소 등급: 일반, FREE 배지(API 키·서버 비용이 없어 가입 회원 누구나 사용)
--  - 요금제: 플랫폼 표준 1·2·3개월 (FREE 배지를 뗄 때를 대비해 함께 등록)
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'infinite-loop-video',
  '무한루프 영상자동화',
  '영상에서 가장 자연스럽게 이어지는 구간을 찾아 끝없이 반복되는 MP4·WebM·GIF로 만드는 도구',
  '영상을 올리면 프레임을 비교해 시작과 끝이 가장 닮은 구간을 찾아주고(스마트 루프), 크로스페이드로 이음새를 감추거나 영상 전체를 1초 겹치거나(강제 오버랩) 앞뒤로 왕복(바운스)시켜 무한 반복 영상을 만듭니다. 시작·종료 지점을 0.01초 단위로 다듬고, 반복 횟수 1~200회, MP4·WebM(소리 유지)·GIF로 저장합니다. 모든 처리는 브라우저 안에서만 이뤄져 영상이 서버로 전송되지 않고 API 키도 필요 없습니다.',
  'https://infinite-loop-video.buylife.xyz',
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
WHERE p.slug = 'infinite-loop-video'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);
