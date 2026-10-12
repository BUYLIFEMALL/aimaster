-- emotion-writer v1.05: 사이드바 FREE 배지 태그 제거 및 제목 줄바꿈(whitespace-nowrap) 방지
UPDATE public.programs
SET
  version = 'v1.05',
  updated_at = NOW()
WHERE slug = 'emotion-writer';
