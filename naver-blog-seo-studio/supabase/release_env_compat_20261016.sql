-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.64',
    extension_version = 'v1.64',
    extension_download_url = 'https://naver-blog-seo-studio.vercel.app/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio' and version = 'v1.63'
returning slug, version, extension_version, extension_download_url;
