-- v2.11 (2026-10-23): 모아 둔 수정 배포 — 설정 화면 설치 상태 문구(확장 응답 없을 때 「설치 전이거나 v2.09 이하 버전」), 번호 발급 때 기한 지난 미사용 연결 번호 정리. 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.11', extension_version = 'v2.11', updated_at = now() where slug = 'naver-blog-agent';
