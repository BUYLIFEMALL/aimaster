-- v1.44 (2026-10-16): 도메인 통일(SSO) — threads-easy-planner.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.44', app_url='https://threads-easy-planner.buylife.xyz', updated_at=now() where slug='threads-easy-planner';
