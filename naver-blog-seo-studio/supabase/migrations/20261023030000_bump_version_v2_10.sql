-- v2.10 (2026-10-23): 설정 화면 확장 카드가 회원이 누른 「설치 완료」 기록 대신 이 브라우저의 확장에 실제 버전을 물어 표시(설치됨·업데이트 필요·설치 전). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.10', extension_version = 'v2.10', updated_at = now() where slug = 'naver-blog-seo-studio';
