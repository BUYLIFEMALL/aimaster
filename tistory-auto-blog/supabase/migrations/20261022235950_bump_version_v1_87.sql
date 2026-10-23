-- v1.87 (2026-10-22): 글감 출처 저장·표시(20261022235900_post_source_v1_87.sql) + 모아 둔 수정 4가지(RSS 안전 해석·글 생성 150초 제한·시험 연결·문서 안내). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v1.87', extension_version = 'v1.87', updated_at = now() where slug = 'tistory-auto-blog';
