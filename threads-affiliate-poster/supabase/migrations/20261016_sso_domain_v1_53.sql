-- v1.53 (2026-10-16): 도메인 통일(SSO) — threads-affiliate-poster.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.53', app_url='https://threads-affiliate-poster.buylife.xyz', updated_at=now() where slug='threads-affiliate-poster';
