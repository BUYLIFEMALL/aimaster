-- v1.08 (2026-10-16): 도메인 통일(SSO) — auto-instagram-posting.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.08', app_url='https://auto-instagram-posting.buylife.xyz', updated_at=now() where slug='auto-instagram-posting';
