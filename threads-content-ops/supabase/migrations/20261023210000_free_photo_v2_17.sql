-- v2.17 (2026-10-23): 작성 탭 글 첨부 미디어에 「📷 무료 사진」(회원 본인 Pixabay·Pexels 키, 공용 free-photo-search·photo-keywords 사본, 회원 up 폴더 저장 → 30일 정리 그대로, JPEG·PNG만), 설정 키 칸·연결 확인. DB 구조 변경 없음, 버전만.
update public.programs set version = 'v2.17', updated_at = now() where slug = 'threads-content-ops';
