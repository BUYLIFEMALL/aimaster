-- v1.63 (2026-10-23): 카드뉴스 배경 무료 사진 검색(회원 본인 Pixabay·Pexels 키, 공용 user_api_keys 재사용 — 허용 목록은 2026-10-12 감성 글귀에서 이미 추가됨). DB 구조 변경 없음, 버전만.
update public.programs set version='v1.63', updated_at=now() where slug='auto-instagram-posting';
