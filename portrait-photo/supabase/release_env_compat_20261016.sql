-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.19',
    updated_at = now()
where slug = 'portrait-photo' and version = 'v1.18'
returning slug, version, extension_version, extension_download_url;
