-- v1.06 (2026-10-16): 도메인 통일(SSO) — video-to-gif.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.06', app_url='https://video-to-gif.buylife.xyz/dashboard', updated_at=now() where slug='video-to-gif';
