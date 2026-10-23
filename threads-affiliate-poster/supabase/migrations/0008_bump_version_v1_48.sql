-- threads-affiliate-poster v1.48: 상품 관리의 "상품·상세페이지 분석으로 등록" 기능 삭제 (링크·검색 등록만 유지)
UPDATE public.programs
SET version = 'v1.48', updated_at = NOW()
WHERE slug = 'threads-affiliate-poster';
