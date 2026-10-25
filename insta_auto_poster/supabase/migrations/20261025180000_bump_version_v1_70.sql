-- Bump version to v1.70 for auto-instagram-posting
UPDATE public.programs
SET version = 'v1.70',
    updated_at = NOW()
WHERE slug = 'auto-instagram-posting';
