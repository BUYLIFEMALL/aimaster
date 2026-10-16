-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.42',
    extension_version = 'v1.42',
    extension_download_url = 'https://naver-blog-allinone.buylife.xyz/downloads/naver-blog-allinone-latest.zip',
    updated_at = now()
where slug = 'naver-blog-allinone' and version = 'v1.41'
returning slug, version, extension_version, extension_download_url;
