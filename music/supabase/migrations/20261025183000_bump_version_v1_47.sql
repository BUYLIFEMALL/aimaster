-- Bump version to v1.47 for music-automation
UPDATE public.programs
SET version = 'v1.47',
    updated_at = NOW()
WHERE slug = 'music-automation';
