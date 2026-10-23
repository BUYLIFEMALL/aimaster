-- v1.66 (2026-10-23): 피드 새 글 무료 사진 검색어 칸 Enter가 새 글 양식까지 제출하던 문제 수정(v1.65에서 생김), 연결 확인 버튼에 제공처 이름. DB 구조 변경 없음, 버전만.
update public.programs set version='v1.66', updated_at=now() where slug='auto-instagram-posting';
