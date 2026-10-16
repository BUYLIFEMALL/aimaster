-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.43',
    updated_at = now()
where slug = 'threads-easy-planner' and version = 'v1.42'
returning slug, version, extension_version, extension_download_url;
