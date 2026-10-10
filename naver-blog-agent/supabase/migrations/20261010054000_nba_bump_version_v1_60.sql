-- v1.60: preserve emoji captions and wait for late editor resume dialogs.
-- Version metadata only; existing user drafts and images remain intact.
update public.programs
set version = 'v1.60',
    extension_version = 'v1.60',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
