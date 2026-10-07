-- Migration: bump naver-blog-agent version to v1.20
-- Add auto-save on content creation, dedicated saved posts archive page (/queue), and quick recent posts loader.

UPDATE public.programs
SET version = 'v1.20',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
