-- v1.06: login required (no guest bypass), own API keys only, admin-only shared prompts.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'ai-image-studio';
