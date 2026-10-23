-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'shop-detail-page' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;
