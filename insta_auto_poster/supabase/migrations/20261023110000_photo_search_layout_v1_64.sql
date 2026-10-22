-- v1.64 (2026-10-23): 무료 사진 검색 칸 배치 수정(공용 입력 클래스 w-full이 좁은 칸 너비를 덮어씀). DB 구조 변경 없음, 버전만.
update public.programs set version='v1.64', updated_at=now() where slug='auto-instagram-posting';
