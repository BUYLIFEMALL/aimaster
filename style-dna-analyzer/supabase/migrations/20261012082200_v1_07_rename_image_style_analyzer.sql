-- 2026-10-12: v1.07 이미지 스타일 분석기 이름 변경 및 V3 PRO STUDIO 제거
UPDATE programs
SET 
  name = '이미지 스타일 분석기',
  short_desc = '이미지 한 장의 카메라·조명·색감·스타일을 분석해 그대로 재현하거나 변형할 수 있는 마스터 프롬프트로 만들어 주는 이미지 스타일 분석기',
  version = 'v1.07',
  updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
