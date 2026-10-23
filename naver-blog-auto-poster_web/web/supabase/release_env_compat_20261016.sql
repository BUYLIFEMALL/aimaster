-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    extension_version = 'v1.06',
    extension_download_url = 'https://www.buylife.xyz/downloads/naver-blog-auto-poster-web-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-auto-poster-web' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;
