-- shorts-viral-studio v1.05 (2026-10-11): 이용 권한 판정을 루트 표준(createAdminClient + checkProgramAccess 사본)으로 교체.
-- 코드만 바뀌고 DB 구조 변경은 없다. 프로그램 버전만 갱신한다.
update programs set version = 'v1.05', updated_at = now() where slug = 'shorts-viral-studio';
