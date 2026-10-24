-- AI 부동산 매물 알림 — 카톡·이메일 받기(플랜 docs/PLAN_20261025_KAKAO_EMAIL.md)
-- 대상: ① AIMaster 운영 DB (ref esgxyikcnnvmlhygjkth). 실행: 주인님(크롬 SQL 편집기 Run). 다시 실행해도 안전.

-- 1) 받는 방법 칸: 카톡 요약·이메일(엑셀 첨부)·받는 메일 주소
alter table public.realty_alert_settings add column if not exists notify_kakao boolean not null default false;
alter table public.realty_alert_settings add column if not exists notify_email boolean not null default false;
alter table public.realty_alert_settings add column if not exists email_to text;
alter table public.realty_alert_settings drop constraint if exists realty_alert_settings_email_to_check;
alter table public.realty_alert_settings add constraint realty_alert_settings_email_to_check
  check (email_to is null or (char_length(email_to) <= 254 and email_to ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

-- 2) 공용 회원 키에 메일 발송 키(Resend) 추가 — 다른 프로그램이 넣어 둔 현재 목록을 그대로 읽어 한 값만 더한다
do $$
declare
  def text;
  vals text[];
begin
  select pg_get_constraintdef(oid) into def from pg_constraint
  where conrelid = 'public.user_api_keys'::regclass and conname = 'user_api_keys_provider_check';
  if def is null then
    raise exception 'user_api_keys_provider_check 제약을 찾지 못했습니다';
  end if;
  if position('resend_api_key' in def) > 0 then
    return; -- 이미 있음
  end if;
  select array_agg(m[1]) into vals from regexp_matches(def, chr(39) || '([^' || chr(39) || ']+)' || chr(39), 'g') as m;
  vals := array_append(vals, 'resend_api_key');
  execute 'alter table public.user_api_keys drop constraint user_api_keys_provider_check';
  execute format('alter table public.user_api_keys add constraint user_api_keys_provider_check check (provider = any (%L::text[]))', vals);
end $$;

-- 확인
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'realty_alert_settings' and column_name in ('notify_kakao', 'notify_email', 'email_to');
select position('resend_api_key' in pg_get_constraintdef(oid)) > 0 as resend_ok
from pg_constraint where conname = 'user_api_keys_provider_check';
