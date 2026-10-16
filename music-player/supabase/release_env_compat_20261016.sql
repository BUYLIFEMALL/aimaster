-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.03',
    updated_at = now()
where slug = 'music-player' and version = 'v1.02'
returning slug, version, extension_version, extension_download_url;
