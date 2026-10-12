-- 2026-10-12: v1.09 직관적이고 자연스러운 1안 스타일 용어 체계 적용
-- (스타일 분석 시작, 스타일 복제/변형, 변형 강도, 스타일 핵심 요소, 스타일 일치율, 추가 분석 지침)
UPDATE programs
SET 
  version = 'v1.09',
  updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
