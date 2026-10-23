-- BLOG 확장 입력 실행 번호·임대(2026-10-10, v1.43, 주인님 승인 후 MCP로 운영 DB 적용).
-- 늦게 도착한 옛 실행의 보고가 새로 시작한 실행의 상태를 덮어쓰지 못하게 한다.
--  naver_run_id: 확장이 글을 가져가거나 직접 시작할 때 서버가 만드는 실행 번호. 이후 모든 보고에 이 번호가 필요하다.
--  naver_lease_expires_at: 실행이 살아 있다는 표시(확장이 주기적으로 연장). 지나면 PC 단절·확장 종료로 보고 웹에서 다시 보낼 수 있다.
alter table public.blog_posts
  add column if not exists naver_run_id uuid,
  add column if not exists naver_lease_expires_at timestamptz;
