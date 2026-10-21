-- v1.76 프로그램 이름 변경 (2026-10-21, 주인님 지시) — 이전 이름: BLOG(원문)생성 자동화, 이전 extension_version v1.74
update public.programs set name = '블로그 포스팅 자동화', version = 'v1.76', extension_version = 'v1.76', extension_download_url = 'https://ai-auto-blog.buylife.xyz/downloads/ai-auto-blog-extension-latest.zip', updated_at = now() where slug = 'ai-auto-blog';
