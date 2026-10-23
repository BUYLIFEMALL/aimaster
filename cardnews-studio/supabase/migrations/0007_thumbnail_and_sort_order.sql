-- 인스타 카드뉴스 자동화 최신 16:9 실사 썸네일 등록 및 sort_order 최상단(121) 배치
UPDATE public.programs
SET
  name = '인스타 카드뉴스 자동화',
  sort_order = 121,
  badges = '["new", "best"]'::jsonb,
  thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/cardnews-studio-thumbnail.jpg?v=1791779645694',
  updated_at = NOW()
WHERE slug = 'cardnews-studio';
