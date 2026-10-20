-- Apply after the v1.21 production deployment is READY.
UPDATE public.programs SET version = 'v1.21'
WHERE slug = 'ai-image-studio' AND version = 'v1.20'
RETURNING slug, version, app_url;
