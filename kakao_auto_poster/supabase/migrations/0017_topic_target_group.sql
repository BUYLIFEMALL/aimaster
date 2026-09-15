-- 예약 리포트 알림(카카오톡)이 등록해둔 수신자 "전체"에게만 나가던 것을, 주제별로 특정
-- 그룹만 골라서 보낼 수 있게 한다(사용자 지시, 2026-09-15: "그룹을 선택해서 특정 그룹에
-- 속한 사람들에게만 발송하게 하는 기능을 구현하고 싶어"). null이면 기존과 동일하게 전체
-- 수신자(미분류 포함) 대상 — 하위 호환을 위해 기본값을 null로 둔다.
alter table kakao_topics
  add column target_group_id uuid references kakao_broadcast_groups (id) on delete set null;
