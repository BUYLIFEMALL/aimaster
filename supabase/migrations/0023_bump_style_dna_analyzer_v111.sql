-- style-dna-analyzer v1.11 버전 동기화
-- 색상 스와치 원형 칩 입체 렌더링 개선 및 5대 시그니처 미학적 컬러 팔레트 연동

UPDATE public.programs
SET 
  version = 'v1.11',
  updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
