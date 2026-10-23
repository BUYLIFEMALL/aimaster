-- emotion-writer v1.06: 사이드바 하단 메뉴를 WORKFLOW 메뉴 바로 아래로 밀착 배치
UPDATE public.programs
SET
  version = 'v1.06',
  updated_at = NOW()
WHERE slug = 'emotion-writer';
