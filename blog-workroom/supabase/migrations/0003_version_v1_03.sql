-- 2026-10-16 v1.03: 실제 네이버 키 흐름 검수 후 수정(등급 기준 실측 보정, 연관어 짧은 단어 조회, 데이터랩 집계 지연, 검수 제안 지시문). 운영 DB 적용 완료.
update public.programs set version = 'v1.03', updated_at = now() where slug = 'blog-workroom';
