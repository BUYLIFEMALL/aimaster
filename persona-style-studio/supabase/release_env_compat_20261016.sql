-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'persona-style-studio' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;
