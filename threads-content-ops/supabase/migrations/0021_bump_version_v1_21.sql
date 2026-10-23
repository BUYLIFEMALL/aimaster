-- Catalog version synchronization for Threads 콘텐츠 운영 자동화 v1.21.
UPDATE public.programs
SET version = 'v1.21',
    updated_at = NOW()
WHERE slug = 'threads-content-ops';
