-- v1.86 (2026-10-16): 옛 vercel.app 삭제 대비 — 확장 서버 주소(API) 새 주소, 다운로드 주소 새 주소
update public.programs set version='v1.86', extension_version='v1.86', extension_download_url='https://naver-blog-agent.buylife.xyz/downloads/naver-blog-agent-extension-latest.zip', updated_at=now() where slug='naver-blog-agent';
