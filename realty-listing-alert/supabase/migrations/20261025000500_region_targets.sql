-- AI 부동산 매물 알림 — 지역(시·구·동) 감시 대상 (2026-10-25, 주인님 지시 「구단위 버튼식 지역 설정」, 플랜 docs/PLAN_20261025_STAGE3.md §7)
-- 대상: ① AIMaster 운영 DB (ref esgxyikcnnvmlhygjkth). 실행: 주인님(크롬 SQL 편집기 Run). 다시 실행해도 안전.
-- 지역 1개 = 감시 대상 1개(10개 상한 트리거 그대로). 지역 대상은 확장이 그 동에서 매물 많은 단지 상위 N곳(3~10, 기본 5)만 읽는다.
-- 지역 번호 = 법정동 코드 10자리 = 네이버 cortarNo(0단계 사전 검증). 매물 내용은 여전히 저장하지 않는다.

alter table public.realty_alert_targets
  add column if not exists target_type text not null default 'complex',
  add column if not exists cortar_no text,
  add column if not exists region_name text,
  add column if not exists region_max_complexes smallint not null default 5;

alter table public.realty_alert_targets alter column complex_no drop not null;

alter table public.realty_alert_targets drop constraint if exists realty_alert_targets_type_check;
alter table public.realty_alert_targets add constraint realty_alert_targets_type_check check (
  (target_type = 'complex' and complex_no is not null and cortar_no is null)
  or (target_type = 'region' and complex_no is null and cortar_no ~ '^[0-9]{10}$'
      and region_name is not null and char_length(region_name) <= 100)
);

alter table public.realty_alert_targets drop constraint if exists realty_alert_targets_region_max_check;
alter table public.realty_alert_targets add constraint realty_alert_targets_region_max_check check (region_max_complexes between 3 and 10);

create unique index if not exists realty_alert_targets_user_cortar_uniq
  on public.realty_alert_targets (user_id, cortar_no) where cortar_no is not null;

-- 확인
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'realty_alert_targets'
  and column_name in ('target_type', 'cortar_no', 'region_name', 'region_max_complexes', 'complex_no')
order by column_name;
