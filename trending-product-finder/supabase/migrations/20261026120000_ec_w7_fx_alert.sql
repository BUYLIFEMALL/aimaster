-- EC-W7(2026-10-26, 주인님 승인): 관세청 과세환율 공용 참고 표 + 관심 목록 기회 점수 알림 기준
-- 대상: ① AIMaster 운영 DB(ref esgxyikcnnvmlhygjkth)

-- 1) 관세청 과세환율(수입, 주 단위). 누가 조회해도 같은 공공 자료라 회원 데이터가 아니다.
--    로그인 회원은 읽기만, 쓰기는 서버(service role)만 — 쓰기 정책을 두지 않는다.
create table if not exists public.customs_fx_rates (
  currency text not null,              -- 통화부호(USD·CNY·JPY·EUR …)
  apply_start date not null,           -- 적용개시일자(관세청 주간 환율 시작일)
  rate_krw numeric(14, 4) not null,    -- 1단위당 원화(100엔 표기면 1엔으로 나눈 값)
  unit integer not null default 1,     -- 관세청 원문 단위(100엔이면 100)
  fetched_at timestamptz not null default now(),
  primary key (currency, apply_start)
);

alter table public.customs_fx_rates enable row level security;

drop policy if exists customs_fx_rates_read on public.customs_fx_rates;
create policy customs_fx_rates_read on public.customs_fx_rates
  for select to authenticated using (true);

-- 2) 관심 목록별 「기회 점수 ○점 이상만 알림」 (null = 끔, 예전처럼 매일 리포트 전체 알림)
alter table public.trend_watchlist
  add column if not exists score_alert_threshold smallint;

alter table public.trend_watchlist drop constraint if exists trend_watchlist_score_alert_threshold_check;
alter table public.trend_watchlist add constraint trend_watchlist_score_alert_threshold_check
  check (score_alert_threshold is null or (score_alert_threshold between 1 and 100));
