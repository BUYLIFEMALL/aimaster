-- v1.53: edited article is saved to the vault on "편집 완료". Program version + Chrome extension version/download (extension rule: docs/EXTENSION_RELEASE_RULES.md).
update public.programs
set version = 'v1.53',
    extension_version = 'v1.53',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
