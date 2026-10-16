-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'auto-instagram-posting' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;
