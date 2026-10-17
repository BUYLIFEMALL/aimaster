-- 2026-10-17 v1.14: 다크 모드·닫을 때 즉시 저장·단축키 창 서식 넣기·고정 색깔 꼬리표 (DB 구조 변경 없음)
update programs set version = 'v1.14', updated_at = now() where slug = 'markdown-studio';
