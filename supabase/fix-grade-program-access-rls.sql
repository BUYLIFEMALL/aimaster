-- grade_program_access는 RLS는 켜져 있었지만 정책이 하나도 없어서, 일반 로그인 사용자는
-- 이 테이블을 전혀 읽을 수 없었다(Postgres RLS 기본값: 정책 없으면 소유자/서비스롤 외 전부 차단).
-- 관리자 화면(/admin/access-matrix)은 createServiceClient()(RLS 우회)로 읽고 쓰기 때문에
-- 지금까지 문제가 드러나지 않았지만, lib/access/checkProgramAccess.ts처럼 일반 사용자 세션으로
-- 이 테이블을 조회하는 모든 곳에서 항상 빈 결과만 받아서 등급별 세밀 예외 기능이 조용히
-- 작동하지 않고 있었다. 2026-09-04, MCP로 적용 완료.

CREATE POLICY grade_program_access_select_all ON grade_program_access
  FOR SELECT USING (true);

CREATE POLICY admin_all_grade_program_access ON grade_program_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
