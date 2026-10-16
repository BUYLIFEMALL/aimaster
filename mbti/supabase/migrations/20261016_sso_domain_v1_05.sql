-- v1.05 (2026-10-16): 도메인 통일(SSO) — personality-code.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.05', app_url='https://personality-code.buylife.xyz', updated_at=now() where slug='personality-code';
