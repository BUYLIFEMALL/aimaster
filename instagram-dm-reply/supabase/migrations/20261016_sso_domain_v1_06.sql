-- v1.06 (2026-10-16): 도메인 통일(SSO) — instagram-dm-reply.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유
update public.programs set version='v1.06', app_url='https://instagram-dm-reply.buylife.xyz', updated_at=now() where slug='instagram-dm-reply';
