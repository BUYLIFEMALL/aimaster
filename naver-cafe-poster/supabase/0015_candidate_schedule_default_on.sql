-- 사용자 요청(2026-09-16)으로 "후보함에서 예약 발행"의 기본 동작을 opt-in(기본 OFF, 켠
-- 것만 대상) → opt-out(기본 ON, 뺴고 싶은 것만 끄는 방식)으로 전환한다. 선택한 카테고리에
-- 속한 글은 기존에 모아둔 것/앞으로 새로 모이는 것 구분 없이 전부 자동 발행 대상이 되고,
-- "예약포스팅" 버튼은 이제 "이 글만 빼고 싶다"는 제외용으로 의미가 바뀐다.
alter table public.ncafe_candidates alter column use_for_schedule set default true;

-- 지금까지 모아둔 기존 후보(전부 false, 아직 아무도 켠 적 없음 — 실사용 데이터 없음 확인)도
-- 새 기본값에 맞춰 전부 포함시킨다.
update public.ncafe_candidates set use_for_schedule = true where use_for_schedule = false;
