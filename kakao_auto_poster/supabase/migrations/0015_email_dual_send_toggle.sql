-- 카카오톡 발송 시 이메일을 함께/대체로 보낼지 회원이 직접 켜고 끌 수 있게 한다
-- (사용자 지시, 2026-09-10) — ON이면 카카오 발송 성공 시에도 이메일이 등록된 사람에게
-- 이메일을 함께 보내고, 카카오 발송이 실패했을 때도 이메일로 대체 발송한다. OFF면 이
-- 자동화 발송 경로들(예약 자동 발송/자유 메시지 발송/알림톡 리포트 발송)에서 이메일을
-- 전혀 건드리지 않고 카카오만 시도한다. 전화번호 없는 이메일 전용 수신자는 이 설정과
-- 무관하게 항상 이메일로 받는다(애초에 카카오 발송 자체가 없으므로).
alter table public.user_solapi_accounts
  add column if not exists email_dual_send_enabled boolean not null default true;
