-- v1.85 (2026-10-16): 도메인 통일(SSO) — naver-blog-agent.buylife.xyz, 로그인 쿠키 .buylife.xyz 공유, 확장이 새 주소도 인식.
-- extension_download_url은 옛 주소 유지: 설치된 옛 확장의 새 버전 알림이 다운로드 주소가 옛 주소로 시작할 때만 보이기 때문(옛 주소 ZIP은 새 주소로 308 이동해 받아짐).
update public.programs set version='v1.85', app_url='https://naver-blog-agent.buylife.xyz', extension_version='v1.85', updated_at=now() where slug='naver-blog-agent';
