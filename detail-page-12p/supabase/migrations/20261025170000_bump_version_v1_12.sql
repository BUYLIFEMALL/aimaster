-- detail-page-12p v1.12 버전 업데이트
UPDATE public.programs
SET version = 'v1.12',
    updated_at = NOW()
WHERE slug = 'detail-page-12p';
