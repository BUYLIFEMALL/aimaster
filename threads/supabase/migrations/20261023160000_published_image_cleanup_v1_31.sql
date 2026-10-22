-- v1.31 (2026-10-23): 30일 정리에 「게시 완료 후 30일 지난 글의 사진 칸 비우기(post-images 주소만, 본문·Threads 링크·게시 기록 유지)」 추가(주인님 결정), 무료 사진 검색 「🔤 영어로」(AI 없이 사전). DB 구조 변경 없음, 버전만.
update public.programs set version='v1.31', updated_at=now() where slug='auto-threads-posting';
