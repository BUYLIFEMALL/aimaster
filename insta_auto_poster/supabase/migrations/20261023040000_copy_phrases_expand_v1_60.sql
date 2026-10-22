-- v1.60 「⚠ 겹침 n」을 누르면 겹친 구절 펼치기(DB 구조 변경 없음)
update programs set version = 'v1.60', updated_at = now() where slug = 'auto-instagram-posting';
