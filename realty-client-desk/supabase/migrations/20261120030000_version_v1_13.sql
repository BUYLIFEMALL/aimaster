-- v1.13 (준비 2026-11-20, 미배포·미적용): 상태 변경 뒤 선택 상자가 첫 값으로 보이던 v1.12 회귀 수정(38f29dbdc)만. 빌드·적용은 관리자 승인 뒤.
update programs set version = 'v1.13', updated_at = now() where slug = 'realty-client-desk' and version = 'v1.12';
