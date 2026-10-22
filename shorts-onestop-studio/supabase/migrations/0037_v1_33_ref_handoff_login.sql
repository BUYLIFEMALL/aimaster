-- v1.33 로그인 화면을 거쳐도 넘겨받은 레퍼런스 대사 유지(sessionStorage, DB 구조 변경 없음)
update programs set version = 'v1.33', updated_at = now() where slug = 'shorts-onestop-studio';
