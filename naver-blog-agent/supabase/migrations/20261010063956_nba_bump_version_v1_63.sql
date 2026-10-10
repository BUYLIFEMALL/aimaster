-- v1.63: safe tab lifecycle, worker restart and publication outcome reporting.
-- Version metadata only; no schema or member content changes.
update public.programs
set version = 'v1.63',
    extension_version = 'v1.63',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
