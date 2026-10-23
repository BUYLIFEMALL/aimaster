-- v1.30 (2026-10-23): 글 이미지 30일 정리(post-images/<회원>/ 중 어떤 글에도 쓰이지 않는 30일 지난 파일만, 하루 1회 /api/cleanup-images — 주인님 결정), 설정 무료 사진 키 연결 확인, 검색 영어 안내. DB 구조 변경 없음, 버전만.
update public.programs set version='v1.30', updated_at=now() where slug='auto-threads-posting';
