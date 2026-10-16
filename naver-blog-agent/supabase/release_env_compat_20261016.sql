-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.84',
    extension_version = 'v1.84',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent' and version = 'v1.83'
returning slug, version, extension_version, extension_download_url;
