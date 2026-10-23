-- 플랫폼(운영자 SMTP) 메일 발송 기록. 메일 발송 안전장치(lib/email/guard.ts)가 이 표로
-- ① 한도 오류 뒤 대기(cooldown) ② 같은 메일 중복 발송 방지 ③ 수신자별·하루 전체 발송 상한을 판단한다.
-- 서비스 키로만 읽고 쓴다(RLS 켜고 정책은 만들지 않음). 30일이 지난 기록은 매일 구독 만료 알림 크론이 지운다.
create table if not exists public.platform_email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  kind text not null,                 -- welcome | payment | expiry | support_admin | support_confirm
  subject_key text not null default '',
  status text not null check (status in ('sent', 'failed', 'rate_limited', 'auth_failed', 'skipped')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists platform_email_log_created_idx on public.platform_email_log (created_at desc);
create index if not exists platform_email_log_recipient_idx on public.platform_email_log (to_email, kind, created_at desc);

alter table public.platform_email_log enable row level security;
