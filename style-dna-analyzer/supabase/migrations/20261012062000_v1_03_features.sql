-- style-dna-analyzer v1.03: 원본 사이트(style-dna-3) 정밀 분석 기반 기능 확장 (돌연변이 레벨 슬라이더, [첨부 이미지] 앵커 토글, 타겟 모델 최적화, 12종 비율 감지, 도움말 모달, 프롬프트 직접 편집 및 줌 확대)
UPDATE public.programs
SET
  version = 'v1.03',
  updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
