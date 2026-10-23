-- v2.12 (2026-10-23): 모아 둔 확장 수정 배포 — ① 입력·자동 포스팅을 확장 background(서비스 워커)에서 실행해 사이드패널을 닫아도 이어짐 ② 입력 중 안내 문구 ③ 사이드패널을 다시 열 때 끊긴 writing 실행 즉시 정리. 서버 코드 변경 없음.
update public.programs set version = 'v2.12', extension_version = 'v2.12', updated_at = now() where slug = 'naver-blog-seo-studio';
