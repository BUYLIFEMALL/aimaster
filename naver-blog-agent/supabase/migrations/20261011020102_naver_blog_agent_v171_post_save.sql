-- Release metadata only; existing nba_posts JSON and UUID primary key handle saves.
UPDATE public.programs SET version='v1.71', extension_version='v1.71',
 extension_download_url='https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip', updated_at=now()
WHERE slug='naver-blog-agent';
