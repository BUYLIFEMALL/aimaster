-- Phase 5 보완: trending-product-finder의 SourcingAlertControls.tsx(가격/품절 추적 알림
-- 채널 칩)와 동일한 방식으로, 주제마다 리포트 생성 알림을 받을 채널(이메일/텔레그램)을
-- 개별로 켜고 끌 수 있게 한다. 카카오톡 발송은 여기 포함하지 않는다 — 카카오는 "알림"이
-- 아니라 실제 발행 액션(수동 버튼 또는 텔레그램 승인)이라 성격이 달라서, 이 칩으로 자동
-- 발행을 켜버리면 검토 없이 카카오톡이 나가는 큰 동작 변경이 된다. 기존 회원 전부
-- 이메일+텔레그램이 켜진 상태(기존 동작과 동일)로 시작한다.
alter table public.kakao_topics
  add column if not exists notify_channels text[] not null default array['email','telegram']::text[];
