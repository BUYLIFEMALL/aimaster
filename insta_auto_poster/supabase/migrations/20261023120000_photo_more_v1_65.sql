-- v1.65 (2026-10-23): 무료 사진 — 자동 채우기 「장마다 서로 다른 사진」, 설정 「연결 확인」, 피드 새 글 직접 첨부에 무료 사진(insta-post-images, JPEG) + 미배포분(자동 채우기·출처 배지·공용 기준 코드). DB 구조 변경 없음, 버전만.
update public.programs set version='v1.65', updated_at=now() where slug='auto-instagram-posting';
