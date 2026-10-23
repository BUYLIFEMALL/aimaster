-- v1.72 (2026-10-16): 도메인 통일(SSO) — tistory-auto-blog.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유, 확장이 새 주소도 인식
update public.programs set version='v1.72', app_url='https://tistory-auto-blog.buylife.xyz', extension_version='v1.72', extension_download_url='https://tistory-auto-blog.buylife.xyz/downloads/tistory-auto-blog-extension-latest.zip', updated_at=now() where slug='tistory-auto-blog';
