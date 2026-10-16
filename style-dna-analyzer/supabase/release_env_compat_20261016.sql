-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.15',
    updated_at = now()
where slug = 'style-dna-analyzer' and version = 'v1.14'
returning slug, version, extension_version, extension_download_url;
