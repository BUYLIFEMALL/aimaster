-- Run after the v1.20 production deployment is READY and the 160 templates match.
UPDATE public.programs
SET version = 'v1.20'
WHERE slug = 'ai-image-studio' AND version = 'v1.19'
RETURNING slug, version, app_url;
