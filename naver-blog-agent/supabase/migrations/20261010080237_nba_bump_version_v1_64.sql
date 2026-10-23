-- v1.64: only acknowledge confirmed result writes; retain and retry pending reports.
-- Metadata only. No schema or member content changes.
update public.programs
set version = 'v1.64',
    extension_version = 'v1.64',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
