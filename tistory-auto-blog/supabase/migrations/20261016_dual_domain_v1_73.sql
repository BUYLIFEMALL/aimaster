-- v1.73 (2026-10-16): 옛 vercel.app 삭제 대비 — 확장 서버 주소(BASE)·안내 링크 새 주소, 허용 목록 두 주소 명시
update public.programs set version='v1.73', extension_version='v1.73', extension_download_url='https://tistory-auto-blog.buylife.xyz/downloads/tistory-auto-blog-extension-latest.zip', updated_at=now() where slug='tistory-auto-blog';
