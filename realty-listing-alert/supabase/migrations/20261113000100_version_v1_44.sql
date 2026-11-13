-- v1.44 (2026-11-13): 단지 감시를 지역 감시보다 먼저 읽기(L-5), 저장공간 위젯, 로그아웃 이 브라우저만. 운영 DB 적용 완료.
update programs set version = 'v1.44', extension_version = 'v1.44', updated_at = now() where slug = 'realty-listing-alert';
