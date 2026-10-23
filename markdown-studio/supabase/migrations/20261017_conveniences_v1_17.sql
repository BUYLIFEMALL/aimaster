-- 2026-10-17 v1.17: 휴지통 비우기·탐색기 꼬리표 색 점·Drive 동기화에 고정 정보 (DB 구조 변경 없음)
update programs set version = 'v1.17', updated_at = now() where slug = 'markdown-studio';
