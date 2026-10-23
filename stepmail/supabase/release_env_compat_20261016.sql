-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.10',
    updated_at = now()
where slug = 'stepmail' and version = 'v1.09'
returning slug, version, extension_version, extension_download_url;
