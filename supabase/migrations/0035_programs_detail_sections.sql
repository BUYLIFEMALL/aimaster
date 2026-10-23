-- 2026-10-16 프로그램 상세 페이지 핵심 특징·사용 순서(프로그램별). 주인님 승인 후 운영 DB 적용 완료.
alter table public.programs add column if not exists detail_sections jsonb;
