-- v1.08 (2026-10-16): 도메인 통일(SSO) — longtail-keyword-expander.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.08', app_url='https://longtail-keyword-expander.buylife.xyz', updated_at=now() where slug='longtail-keyword-expander';
