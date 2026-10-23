-- 2026-10-16 v1.02: 참고 원본 이름 표현 정리(동작 변경 없음). 운영 DB 적용 완료.
update public.programs set version = 'v1.02', updated_at = now() where slug = 'blog-workroom';
