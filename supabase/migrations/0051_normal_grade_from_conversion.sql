-- 2026-10-31 주인님 지시: 일반 등급 사용기간을 가입일이 아니라 일반 등급 전환일부터 14일로 계산한다(0038 변경).
-- 앞으로 전환·부여되는 권한부터 적용되며, 이미 있는 권한의 만료일은 바꾸지 않는다. 함수는 grade_access_expires_at(0050)을 그대로 쓴다.
update member_grades
   set access_start_basis = 'grant'
 where id = '861b7a37-d056-4404-80f5-85edb2e2ebff'; -- 일반
