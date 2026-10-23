-- v1.07 (2026-10-16): 도메인 통일(SSO) — crm-google-form.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.07', app_url='https://crm-google-form.buylife.xyz', updated_at=now() where slug='crm-google-form';
