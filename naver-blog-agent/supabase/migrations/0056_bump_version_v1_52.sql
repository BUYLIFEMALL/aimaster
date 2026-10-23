-- v1.52: queue button label typo (수집소 -> 수집). Program version + Chrome extension version/download (extension rule: docs/EXTENSION_RELEASE_RULES.md).
update public.programs
set version = 'v1.52',
    extension_version = 'v1.52',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
