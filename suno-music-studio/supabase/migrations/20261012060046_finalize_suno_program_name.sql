-- 2026-10-12: user finalized the display name before the first production release.
-- Metadata only. Keep entitlement, visibility, slug, URL, and v1.01 unchanged.
UPDATE public.programs
SET name = 'Suno 음악기획 자동화', updated_at = now()
WHERE slug = 'suno-music-studio';
