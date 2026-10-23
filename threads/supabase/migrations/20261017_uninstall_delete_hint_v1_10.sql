-- 2026-10-17 v1.10: 주소 카드에 제거·삭제 콜백(쇼핑제휴 처리기) 안내 추가
update programs set version = 'v1.10', updated_at = now() where slug = 'auto-threads-posting';
