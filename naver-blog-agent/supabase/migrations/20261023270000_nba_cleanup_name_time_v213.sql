-- v2.13 (2026-10-23): 30일 정리가 옛 버킷에서 옮긴 이미지 복사본을 파일 이름의 생성 시각으로 판정(f1aabf2a2). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.13', extension_version = 'v2.13', updated_at = now() where slug = 'naver-blog-agent';
