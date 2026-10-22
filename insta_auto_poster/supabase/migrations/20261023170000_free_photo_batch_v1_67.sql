-- v1.67 (2026-10-23): 미배포분 묶음 배포 — 피드 이미지 JPEG 저장(직접 첨부·AI), 자동 채우기 설명 한 줄, 무료 사진 공용 사전 photo-keywords(자동 채우기 영어 검색·🔤 버튼), 영어 결과 0장이면 「한국어로 다시 찾기」. DB 구조 변경 없음, 버전만.
update public.programs set version='v1.67', updated_at=now() where slug='auto-instagram-posting';
