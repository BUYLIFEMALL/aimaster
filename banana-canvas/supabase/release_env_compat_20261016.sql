-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'banana-canvas' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;
