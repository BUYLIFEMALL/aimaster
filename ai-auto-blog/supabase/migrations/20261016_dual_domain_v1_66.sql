-- v1.66 (2026-10-16): 옛 vercel.app 삭제 대비 — 확장 서버 주소(BASE)·안내 링크 새 주소(허용 목록은 두 주소 유지)
update public.programs set version='v1.66', extension_version='v1.66', extension_download_url='https://ai-auto-blog.buylife.xyz/downloads/ai-auto-blog-extension-latest.zip', updated_at=now() where slug='ai-auto-blog';
