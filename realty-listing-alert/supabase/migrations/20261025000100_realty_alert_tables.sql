-- AI 부동산 매물 알림 자동화 — 회원 설정 표 3개 (2026-10-25, 2단계, v1.02)
-- 대상: ① AIMaster 운영 DB (ref esgxyikcnnvmlhygjkth). 실행: 주인님(크롬 SQL 편집기 Run). 다시 실행해도 안전.
-- 원칙(인수인계 §0·§4): 이 표들에는 회원 설정과 숫자 상태만 둔다. 네이버 매물 내용(가격·매물 번호 목록)은 저장하지 않는다.
-- 거래 종류 코드: 0단계 사전 검증(PREVALIDATION_20261024.md)에서 A1=매매·B1=전세 확인, B2=월세는 3단계 첫 시험에서 확인.
-- 텔레그램·이메일 연결은 이 표에 두지 않는다 — 공용 user_telegram_links(program_slug='realty-listing-alert')·user_api_keys 재사용.

-- 1) 감시 대상(최대 10개)
create table if not exists public.realty_alert_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  complex_no text not null check (complex_no ~ '^[0-9]{1,12}$'), -- 네이버 단지 번호(공개 주소의 숫자, 매물 데이터 아님)
  complex_name text check (complex_name is null or char_length(complex_name) <= 100),
  trade_types text[] not null default '{A1,B1,B2}' check (trade_types <@ array['A1','B1','B2']::text[] and cardinality(trade_types) >= 1),
  price_min bigint check (price_min is null or price_min >= 0),   -- 만 원 단위
  price_max bigint check (price_max is null or price_max >= 0),
  area_min numeric check (area_min is null or area_min >= 0),     -- 전용 ㎡
  area_max numeric check (area_max is null or area_max >= 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, complex_no)
);

-- 10개 상한: 화면·서버 액션에서도 막지만 DB에서 한 번 더 막는다(인수인계 §7 「11번째 거절 3중」)
create or replace function public.realty_alert_targets_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.realty_alert_targets where user_id = new.user_id) >= 10 then
    raise exception '감시 대상은 최대 10개까지 등록할 수 있습니다.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists realty_alert_targets_limit on public.realty_alert_targets;
create trigger realty_alert_targets_limit before insert on public.realty_alert_targets
  for each row execute function public.realty_alert_targets_limit();

-- 2) 예약·받는 방법 설정(회원당 1행)
create table if not exists public.realty_alert_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schedule_enabled boolean not null default false,
  interval_minutes integer not null default 180
    check (interval_minutes in (10, 20, 30, 40, 50) or (interval_minutes % 60 = 0 and interval_minutes between 60 and 1440)),
  active_hour_start smallint check (active_hour_start is null or active_hour_start between 0 and 23),
  active_hour_end smallint check (active_hour_end is null or active_hour_end between 0 and 23),
  notify_new boolean not null default true,
  notify_price_drop boolean not null default true,
  notify_price_change boolean not null default false,
  notify_gone boolean not null default false,
  deliver_telegram boolean not null default true,
  deliver_file boolean not null default true,
  deliver_email boolean not null default false,
  file_format text not null default 'xlsx' check (file_format in ('xlsx', 'csv')),
  open_tab_when_collecting boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 3) 기기 상태(숫자·상태만, 매물 내용 없음) — 3단계 확장이 보고
create table if not exists public.realty_alert_device_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null check (char_length(device_id) <= 64),
  ext_version text,
  last_run_at timestamptz,
  last_result text check (last_result is null or last_result in ('ok', 'blocked', 'rule_mismatch', 'error')),
  last_count integer,
  last_error text check (last_error is null or char_length(last_error) <= 200),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

-- RLS: 세 표 모두 본인 행만
alter table public.realty_alert_targets enable row level security;
alter table public.realty_alert_settings enable row level security;
alter table public.realty_alert_device_status enable row level security;

drop policy if exists realty_alert_targets_own on public.realty_alert_targets;
create policy realty_alert_targets_own on public.realty_alert_targets
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists realty_alert_settings_own on public.realty_alert_settings;
create policy realty_alert_settings_own on public.realty_alert_settings
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists realty_alert_device_status_own on public.realty_alert_device_status;
create policy realty_alert_device_status_own on public.realty_alert_device_status
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 확인
select table_name, (select count(*) from pg_policies p where p.tablename = t.table_name) as policies
from information_schema.tables t
where table_schema = 'public' and table_name like 'realty_alert_%'
order by table_name;
