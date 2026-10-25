-- Bump version to v1.32 for playlist-channel-studio
UPDATE public.programs
SET version = 'v1.32',
    updated_at = NOW()
WHERE slug = 'playlist-channel-studio';
