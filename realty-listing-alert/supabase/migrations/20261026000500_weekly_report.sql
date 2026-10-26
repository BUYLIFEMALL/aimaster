-- realty-listing-alert v1.33: 📅 주간 리포트 켜기·요일(주인님 승인 2026-10-26 「진행해」 — DB 칸 2개) · 운영 DB esgxyikcnnvmlhygjkth
-- 리포트는 회원 PC 확장이 기록으로 만들어 회원 본인 채널로 보낸다(서버 미보관). 기본값은 꺼짐·월요일.
alter table public.realty_alert_settings add column if not exists notify_weekly boolean not null default false;
alter table public.realty_alert_settings add column if not exists weekly_day smallint not null default 1;
alter table public.realty_alert_settings drop constraint if exists realty_alert_settings_weekly_day_check;
alter table public.realty_alert_settings add constraint realty_alert_settings_weekly_day_check check (weekly_day between 0 and 6);
select column_name, data_type, column_default from information_schema.columns where table_schema = 'public' and table_name = 'realty_alert_settings' and column_name in ('notify_weekly', 'weekly_day');
