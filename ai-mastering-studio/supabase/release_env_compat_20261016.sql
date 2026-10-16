-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'ai-mastering-studio' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;
