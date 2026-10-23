-- Bump ai-auto-blog version to v1.36
update public.programs
set version = 'v1.36',
    updated_at = now()
where slug = 'ai-auto-blog';
