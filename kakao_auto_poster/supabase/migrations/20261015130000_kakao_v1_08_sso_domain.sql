-- 2026-10-15 v1.08: 도메인 연동(SSO) — 새 주소 kakao-auto-posting.buylife.xyz, 옛 kakaoautoposter.vercel.app 화면·카카오 콜백은 새 주소로 넘김. 운영 DB 적용 완료.
update public.programs set version = 'v1.08', app_url = 'https://kakao-auto-posting.buylife.xyz', updated_at = now() where slug = 'kakao-auto-posting';
