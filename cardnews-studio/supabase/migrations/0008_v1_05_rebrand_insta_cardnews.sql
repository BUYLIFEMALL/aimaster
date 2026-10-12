-- v1.05 프로그램명 INSTA Cardnews 자동화 리브랜딩 및 버전 판올림
UPDATE public.programs
SET
  name = 'INSTA Cardnews 자동화',
  version = 'v1.05',
  updated_at = NOW()
WHERE slug = 'cardnews-studio';
