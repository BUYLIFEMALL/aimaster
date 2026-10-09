-- shots v1.04: 운영자 환경변수 키 폴백 삭제(최상위 규칙). 버전만 갱신.
update programs set version = 'v1.04', updated_at = now() where slug = 'auto-shorts-posting';
