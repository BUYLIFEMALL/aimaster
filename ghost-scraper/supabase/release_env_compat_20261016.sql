-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.11',
    updated_at = now()
where slug = 'website-scraper' and version = 'v1.10'
returning slug, version, extension_version, extension_download_url;
