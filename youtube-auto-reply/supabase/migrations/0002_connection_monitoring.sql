-- 유튜브 채널 연결 상태를 정기적으로(cron) 점검해서, 끊어졌으면 사용자에게 텔레그램으로
-- 알려주기 위한 컬럼. needs_reconnect는 화면 배너에도 쓰고, reconnect_notified_at은 같은
-- 끊김 상태에 대해 알림을 중복 발송하지 않기 위한 dedup 용도(재연결하면 다시 null로 초기화).
alter table public.ytreply_accounts
  add column needs_reconnect boolean not null default false,
  add column last_checked_at timestamptz,
  add column reconnect_notified_at timestamptz;
