-- v1.08 (2026-10-16): 도메인 통일(SSO) — naver-cafe-poster.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.08', app_url='https://naver-cafe-poster.buylife.xyz', updated_at=now() where slug='naver-cafe-poster';
