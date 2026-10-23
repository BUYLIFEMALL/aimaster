-- Migration: bump naver-blog-agent version to v1.19
-- Add full Smart Editor with visual/code dual mode, formatting toolbar, image attachment, and AI image generator.

UPDATE public.programs
SET version = 'v1.19',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
