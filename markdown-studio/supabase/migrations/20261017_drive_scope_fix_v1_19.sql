-- 2026-10-17 v1.19: Google 연결 시 예전에 허용한 다른 권한을 합쳐 요청하지 않음(Drive·YouTube 권한 동시 요청 400 오류 수정)
update programs set version = 'v1.19', updated_at = now() where slug = 'markdown-studio';
