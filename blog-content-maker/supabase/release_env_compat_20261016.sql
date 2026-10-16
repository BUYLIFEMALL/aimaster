-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    extension_version = 'v1.04',
    extension_download_url = 'https://blog-content-maker.buylife.xyz/downloads/blog-content-maker-extension-latest.zip',
    updated_at = now()
where slug = 'blog-content-maker' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;
