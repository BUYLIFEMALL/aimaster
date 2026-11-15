-- AI 쇼핑몰 빌더 M5-1a — 몰 주소 예약어에 플랫폼 주소·AIMaster 프로그램 주소 이름을 더함 (2026-11-15 docs/PLAN_20261115_M5_DOMAIN_PAYMENT.md)
-- 백엔드 DB 번호 0090~0099(상호 인수인계 §2).
-- 주인님 결정: 몰 하위 도메인 = `<몰>.buylife.xyz`. AIMaster 프로그램도 `<이름>.buylife.xyz`를 쓰므로 몰 이름이 프로그램 주소와 겹치면 안 된다.
-- 1) 고정 예약어(0001과 같음) + 플랫폼 주소 `mall-builder`·`dev-mall-builder`
-- 2) 운영 DB에 공용 `programs` 표가 있으면 그 slug와 app_url의 하위 도메인 이름도 예약(항상 최신 — 목록을 코드에 적지 않음).
--    Lab DB에는 `programs` 표가 없으므로 표가 있을 때만 동적으로 본다(없으면 건너뜀).
-- immutable → stable(표를 읽으므로). 쓰는 곳은 몰 만들기(0001)·분양 신청(0061) 함수 둘뿐이고 검사 제약·인덱스에는 쓰지 않음(2026-11-15 운영 확인).
-- 함수 하나만 다시 만듦(표·칸 없음).

create or replace function public.mall_builder_is_reserved_slug(p_slug text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_hit boolean := false;
begin
  if p_slug = any (array[
    'admin','api','s','login','logout','signup','www','app','mall','store','stores',
    'help','guide','support','static','assets','public','dashboard','settings','new',
    'mall-builder','dev-mall-builder'
  ]) then
    return true;
  end if;
  if to_regclass('public.programs') is not null then
    execute $q$
      select exists (
        select 1 from public.programs p
         where lower(p.slug) = $1
            or lower(substring(p.app_url from 'https?://([a-z0-9-]+)\.buylife\.xyz')) = $1
      )
    $q$ into v_hit using lower(p_slug);
  end if;
  return coalesce(v_hit, false);
end;
$$;
