-- v1.29 (2026-10-23): 글 첨부 이미지에 무료 사진(회원 본인 Pixabay·Pexels 키, 공용 user_api_keys — 허용 목록은 2026-10-12 감성 글귀에서 이미 추가됨). DB 구조 변경 없음, 버전만.
update public.programs set version='v1.29', updated_at=now() where slug='auto-threads-posting';
