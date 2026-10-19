-- 2026-10-19 주인님 지시: 회원을 「일반」 등급으로 전환하면 가입 시점부터 2주(14일)간 프로그램 사용.
-- 기존 자동 부여 장치(profiles_grade_change_sync 트리거 + grade_access_expires_at)를 그대로 쓰고 설정만 바꾼다.
-- 일반 등급 표(grade_program_access)에 체크된 프로그램이 「가입일 + 14일」까지 자동 부여된다.
-- 트리거는 등급이 바뀔 때만 작동하므로 기존 일반 회원(적용 시점 88명)에게는 소급되지 않는다.
-- MCP execute_sql로 2026-10-19 적용함(사전에 트랜잭션 rollback 시험: 81개 프로그램, 만료 = 가입일 + 14일 확인).
update member_grades
   set auto_grant = true,
       default_access_days = 14,
       access_start_basis = 'signup'
 where id = '861b7a37-d056-4404-80f5-85edb2e2ebff'; -- 일반
