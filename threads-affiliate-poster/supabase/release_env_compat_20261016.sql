-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.52',
    updated_at = now()
where slug = 'threads-affiliate-poster' and version = 'v1.51'
returning slug, version, extension_version, extension_download_url;
