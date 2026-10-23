-- style-dna-analyzer v1.10 버전 동기화
-- '미학적 컬러' 명칭 반영 및 실제 색상 싸이클·바·원 실시간 렌더링 지원

UPDATE public.programs
SET 
  version = 'v1.10',
  updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
