-- Catalog version synchronization for Threads 콘텐츠 운영 자동화 v1.19.
UPDATE public.programs
SET version = 'v1.19',
    updated_at = NOW()
WHERE slug = 'threads-content-ops';
