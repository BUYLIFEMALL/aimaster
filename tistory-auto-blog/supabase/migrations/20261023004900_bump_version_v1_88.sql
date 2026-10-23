-- v1.88 (2026-10-23): 이미지 0장 선택지, 글감 출처를 본문 근거로 사용(모아 둔 작은 수정). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v1.88', extension_version = 'v1.88', updated_at = now() where slug = 'tistory-auto-blog';
