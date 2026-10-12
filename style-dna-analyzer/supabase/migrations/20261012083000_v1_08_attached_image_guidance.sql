-- 2026-10-12: v1.08 [첨부 이미지 제공] 안내 툴팁 & 하단 추론 인터페이스 바 추가
UPDATE programs
SET 
  version = 'v1.08',
  updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
