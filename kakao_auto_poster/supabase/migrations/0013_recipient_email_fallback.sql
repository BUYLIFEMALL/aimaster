-- 수신자에게 이메일(선택)을 추가한다. 카카오톡 발송(브랜드메시지/알림톡)이 실패했을 때만
-- 이 이메일로 대체 발송하는 안전망 용도다(사용자 지시, 2026-09-10) — 항상 이중 발송하지
-- 않고 카카오 실패 시에만 보완하는 방식을 선택했다(발송 비용/스팸 인상 최소화).
alter table public.kakao_broadcast_recipients
  add column if not exists email text;

-- 발송 내역에 어떤 채널로 나갔는지(자유 메시지=브랜드메시지 vs 알림톡)와, 카카오 실패 후
-- 이메일로 대체 발송됐는지를 함께 기록한다 — channel은 앞으로 다른 채널이 추가될 수 있어
-- enum 대신 text로 둔다(현재 값: 'brand' | 'alimtalk').
alter table public.kakao_broadcast_send_log
  add column if not exists channel text not null default 'brand';

alter table public.kakao_broadcast_send_log
  add column if not exists fallback_email boolean not null default false;
