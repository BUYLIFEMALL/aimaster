-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.12',
    updated_at = now()
where slug = 'youtube-viral-studio' and version = 'v1.11'
returning slug, version, extension_version, extension_download_url;
