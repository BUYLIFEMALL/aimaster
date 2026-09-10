-- 전화번호 없이 이메일만으로도 수신자를 등록할 수 있게 한다(사용자 지시, 2026-09-10) — 카카오
-- 채널이 아니라 이메일로만 정보성 콘텐츠를 받고 싶은 사람을 위한 경로. phone을 nullable로
-- 바꾸고, 최소한 전화번호/이메일 중 하나는 있어야 한다는 제약을 건다.
alter table public.kakao_broadcast_recipients
  alter column phone drop not null;

alter table public.kakao_broadcast_recipients
  add constraint kakao_broadcast_recipients_phone_or_email_check
  check (phone is not null or email is not null);

-- 이메일 전용 발송(전화번호가 아예 없는 수신자)도 발송 내역에 남길 수 있도록
-- recipient_phone을 nullable로 바꾸고, 실제로 보낸 이메일 주소를 남길 컬럼을 추가한다.
alter table public.kakao_broadcast_send_log
  alter column recipient_phone drop not null;

alter table public.kakao_broadcast_send_log
  add column if not exists recipient_email text;
