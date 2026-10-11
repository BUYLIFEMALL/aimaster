-- shorts-viral-studio v1.07 (2026-10-11): 모바일 사이드바를 상단 바 + 펼침 메뉴로, 공급사 오류 문구의 키 조각 가림. DB 구조 변경 없음.
update programs set version = 'v1.07', updated_at = now() where slug = 'shorts-viral-studio';
