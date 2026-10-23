-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.95',
    updated_at = now()
where slug = 'threads-content-ops' and version = 'v1.94'
returning slug, version, extension_version, extension_download_url;
