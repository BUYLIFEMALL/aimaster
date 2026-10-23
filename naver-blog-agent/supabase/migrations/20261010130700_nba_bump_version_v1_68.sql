-- Release metadata only; no schema or member-content changes.
update public.programs
set version='v1.68',extension_version='v1.68',extension_download_url='https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',updated_at=now()
where slug='naver-blog-agent';
