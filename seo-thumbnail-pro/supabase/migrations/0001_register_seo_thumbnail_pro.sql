-- 신규 프로그램 seo-thumbnail-pro (AI 유튜브 썸네일 프로) 등록
INSERT INTO public.programs (
  category_id,
  name,
  slug,
  short_desc,
  description,
  is_active,
  sort_order,
  required_grade_id,
  app_url,
  badges,
  version,
  updated_at
) VALUES (
  'cb3c7c75-da5e-4474-a185-f069a6dcbda9',
  'AI 유튜브 썸네일 프로',
  'seo-thumbnail-pro',
  '유튜브 대본·기획안 분석 기반 A/B 테스트 3대 전략 수립, 유튜브 스튜디오 태그(500자) 및 고정 댓글 전략, 16:9 고화질 썸네일 렌더링 솔루션',
  '유튜브 대본이나 영상 아이디어를 입력하면 AI가 성공 공식을 반영한 3가지 A/B 테스트 전략(호기심 유발형, 가치/혜택 중심형, 스토리/감성 후킹형)을 제안합니다. 전략별 최적화된 영상 제목, SEO 설명, 해시태그, 유튜브 스튜디오 전용 태그(500자), 시청자 참여를 폭발시키는 고정 댓글 전략을 한눈에 제공하며, 원클릭으로 16:9 규격 고화질 썸네일을 렌더링하고 피드백 대화형 수정을 지원합니다.',
  true,
  118,
  '861b7a37-d056-4404-80f5-85edb2e2ebff',
  'https://seo-thumbnail-pro.buylife.xyz',
  '["new", "free"]'::jsonb,
  'v1.01',
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  short_desc = EXCLUDED.short_desc,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  required_grade_id = EXCLUDED.required_grade_id,
  app_url = EXCLUDED.app_url,
  badges = EXCLUDED.badges,
  version = EXCLUDED.version,
  updated_at = NOW();
