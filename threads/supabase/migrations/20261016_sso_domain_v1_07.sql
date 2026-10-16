-- v1.07 (2026-10-16): 도메인 통일(SSO) — auto-threads-posting.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.07', app_url='https://auto-threads-posting.buylife.xyz', updated_at=now() where slug='auto-threads-posting';
