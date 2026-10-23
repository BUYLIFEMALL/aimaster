-- v1.59 겹침 표시에 겹친 구절 보이기(DB 구조 변경 없음)
update programs set version = 'v1.59', updated_at = now() where slug = 'auto-instagram-posting';
