-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'ui-canvas' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;
