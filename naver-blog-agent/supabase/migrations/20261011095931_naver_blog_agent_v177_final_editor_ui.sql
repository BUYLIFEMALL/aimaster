-- Release metadata only; no schema, account or key changes.
UPDATE public.programs SET version='v1.77', extension_version='v1.77',
 extension_download_url='https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip', updated_at=now()
WHERE slug='naver-blog-agent';
