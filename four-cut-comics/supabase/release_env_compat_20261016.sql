-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.08',
    updated_at = now()
where slug = 'four-cut-comics' and version = 'v1.07'
returning slug, version, extension_version, extension_download_url;
