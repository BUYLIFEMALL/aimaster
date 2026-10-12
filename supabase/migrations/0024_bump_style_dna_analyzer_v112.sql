-- style-dna-analyzer v1.12 버전 동기화
-- 써클 도넛 꽉 찬 색상 채움, 동적 색상 바(점선 박스 제거) 및 원형 컬러 스와치 시각화

UPDATE public.programs
SET 
  version = 'v1.12',
  updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
