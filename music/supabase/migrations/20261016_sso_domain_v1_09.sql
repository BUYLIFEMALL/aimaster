-- v1.09 (2026-10-16): 도메인 통일(SSO) — music-automation.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.09', app_url='https://music-automation.buylife.xyz', updated_at=now() where slug='music-automation';
