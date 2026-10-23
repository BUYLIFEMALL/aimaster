-- v1.65 (2026-10-16): 도메인 통일(SSO) — ai-auto-blog.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유, 확장이 새 주소도 인식
update public.programs set version='v1.65', app_url='https://ai-auto-blog.buylife.xyz', extension_version='v1.65', extension_download_url='https://ai-auto-blog.buylife.xyz/downloads/ai-auto-blog-extension-latest.zip', updated_at=now() where slug='ai-auto-blog';
