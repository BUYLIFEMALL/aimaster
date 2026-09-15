-- 회원이 카카오톡 "공유하기"로 원하는 채팅방에 리포트를 보내면, 그 채팅방 사람들은
-- AIMaster 회원이 아니어도 로그인 없이 내용을 바로 읽을 수 있어야 한다(2026-09-15 사용자
-- 결정). 그래서 report_id를 그대로 노출하는 대신, 추측 불가능한 별도 share_token(uuid)으로만
-- 접근 가능한 공개 읽기 전용 페이지(/share/[token])를 새로 둔다.
--
-- 이 페이지는 RLS를 느슨하게 풀지 않고 서버 코드에서 admin(service role) 클라이언트로
-- share_token을 정확히 일치시켜 조회한다 — anon 역할에 "select 허용" RLS 정책을 추가하면
-- PostgREST를 통해 필터 없이 테이블 전체가 노출될 위험이 있어(모든 회원의 모든 리포트가
-- anon 키만으로 조회 가능해짐), 그 방식 대신 서버 라우트 자체가 유일한 공개 진입점이 되도록
-- 설계했다. 기존 owner-only RLS(auth.uid() = user_id)는 그대로 유지된다.
alter table kakao_reports
  add column share_token uuid not null default gen_random_uuid();

create unique index kakao_reports_share_token_idx on kakao_reports (share_token);
