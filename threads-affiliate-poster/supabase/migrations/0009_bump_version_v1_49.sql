-- threads-affiliate-poster v1.49: 네이버 트렌드/시장 조사를 회원 본인 네이버 API 키로 전환 (운영자 공용 키 제거)
UPDATE public.programs
SET version = 'v1.49', updated_at = NOW()
WHERE slug = 'threads-affiliate-poster';
