-- v1.10 (2026-10-16): 도메인 통일(SSO) — ai-image-studio.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.10', app_url='https://ai-image-studio.buylife.xyz', updated_at=now() where slug='ai-image-studio';
