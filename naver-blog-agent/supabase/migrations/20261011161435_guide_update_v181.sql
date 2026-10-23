-- Guide v1.81 release metadata; apply after production READY.
update public.programs
set version='v1.81', extension_version='v1.81',
    extension_download_url='https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at=now()
where slug='naver-blog-agent';
