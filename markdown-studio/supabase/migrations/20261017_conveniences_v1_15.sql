-- 2026-10-17 v1.15: 테마 자동(컴퓨터 설정)·로그인 화면 다크·설정 저장 속도·꼬리표 거르기 (DB 구조 변경 없음)
update programs set version = 'v1.15', updated_at = now() where slug = 'markdown-studio';
