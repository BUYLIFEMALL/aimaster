-- AI 쿠팡 운영 자동화 — 회원 아침 요약 설정(묶음 6). 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth.
-- 서버(서비스 키)만 읽고 쓴다(회원 정책 없음). 토큰은 해시만 저장, 요약 내용은 저장하지 않는다.
create table if not exists public.coupang_ops_alerts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  hour integer not null default 8 check (hour between 0 and 23),
  token_hash text unique,
  last_run_date text,
  last_result text,
  updated_at timestamptz not null default now()
);
alter table public.coupang_ops_alerts enable row level security;
