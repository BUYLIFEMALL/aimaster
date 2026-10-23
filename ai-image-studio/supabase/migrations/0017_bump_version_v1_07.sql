-- v1.07: service key is read from the environment only (no embedded fallback).
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'ai-image-studio';
