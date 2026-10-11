-- shorts-viral-studio v1.06 (2026-10-11): 도메인 로그인 공유(docs/DOMAIN_SSO_POLICY.md).
-- 주소를 https://shorts-viral-studio.buylife.xyz 로 바꾼다(옛 vercel.app 주소는 삭제하지 않고 그대로 살아 있다). DB 구조 변경 없음.
update programs
set version = 'v1.06',
    app_url = 'https://shorts-viral-studio.buylife.xyz',
    updated_at = now()
where slug = 'shorts-viral-studio';
