-- v1.58 리메이크 문구 장별 겹침 테두리 · 받아쓰기 → AI 쇼츠 원스톱 넘기기(DB 구조 변경 없음)
update programs set version = 'v1.58', updated_at = now() where slug = 'auto-instagram-posting';
