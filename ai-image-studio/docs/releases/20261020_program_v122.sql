-- Applied after deployment dpl_8anrkCFujg2LUcxMMj1crMHWc2Nt reached READY.
UPDATE public.programs SET version = 'v1.22'
WHERE slug = 'ai-image-studio' AND version = 'v1.21'
RETURNING slug, version, app_url;
