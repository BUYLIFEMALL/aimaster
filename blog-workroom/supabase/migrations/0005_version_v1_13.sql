-- v1.13 (2026-10-23): 이미지를 다시 만들 때 옛 파일 바로 삭제(모아 둔 작은 수정). DB 표 구조 변경 없음(버전만).
update public.programs set version = 'v1.13', updated_at = now() where slug = 'blog-workroom';
