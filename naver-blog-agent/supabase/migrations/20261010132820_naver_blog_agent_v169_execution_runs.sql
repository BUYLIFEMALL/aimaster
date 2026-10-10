-- Release metadata only; execution runs use existing nba_posts.research_summary jsonb.
-- Apply after production READY and verify live ZIP/version together.
update public.programs
set version = 'v1.69', extension_version = 'v1.69',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
