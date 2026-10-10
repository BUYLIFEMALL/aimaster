-- v1.57: 실행 번호·임대(중복 실행·늦게 도착한 옛 보고 방지)와 글별 발행 설정을 저장한다. 기존 행은 모두 null(= 옛 규칙·기본 발행 설정).
-- 권한·RLS 변경 없음(서버 관리자 클라이언트만 사용). 주인님 승인(2026-10-10).
alter table public.tistory_posts
  add column if not exists tistory_run_id uuid,
  add column if not exists tistory_lease_expires_at timestamptz,
  add column if not exists tistory_publish jsonb;
