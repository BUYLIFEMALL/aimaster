-- Release metadata only; saved draft schema and member data are unchanged.
UPDATE public.programs SET version='v1.73', extension_version='v1.73',
 extension_download_url='https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip', updated_at=now()
WHERE slug='naver-blog-agent';
