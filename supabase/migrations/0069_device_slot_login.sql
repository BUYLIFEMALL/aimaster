-- 같은 계정 「PC 1곳 + 모바일 1곳」 동시 접속 (주인님 확정 2026-11-12)
-- 플랜: docs/PLAN_20261112_DEVICE_SLOT_LOGIN.md, 작업 지시서: docs/WORKPLAN_20261112_DEVICE_SLOT_LOGIN.md
-- 동작: auth.sessions에 새 로그인 줄이 생기면, 같은 회원·같은 기기 종류(pc/mobile)의 예전 줄을 지운다.
--       예전 기기의 갱신 토큰(auth.refresh_tokens)은 ON DELETE CASCADE로 함께 지워진다(Lab 2026-11-12 확인).
--       기기 종류를 알 수 없는 로그인(서버 대신 로그인·앱 등, kind = other)은 아무것도 지우지 않는다.
-- 안전: 판정 중 어떤 오류가 나도 로그인 자체는 막지 않는다(예외 처리 후 경고만 남김).
-- 되돌리기: drop trigger if exists trg_enforce_login_device_slot on auth.sessions;
-- 순서: 이 파일은 운영 적용 전 주인님 승인 필요(DB 스키마 변경).
begin;

-- 1. 동시 접속 예외 계정 칸 (관리자·시험 계정, 코드에 이메일을 적지 않음)
alter table public.profiles add column if not exists concurrent_login_exempt boolean not null default false;
comment on column public.profiles.concurrent_login_exempt is '동시 접속(PC1+모바일1) 제한 예외 계정 표시. 회원이 직접 바꿀 수 없음';

create or replace function public.profiles_protect_concurrent_login_exempt() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.concurrent_login_exempt := false;
    elsif new.concurrent_login_exempt is distinct from old.concurrent_login_exempt then
      raise exception 'concurrent_login_exempt cannot be changed by members';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_concurrent_login_exempt on public.profiles;
create trigger profiles_protect_concurrent_login_exempt before insert or update of concurrent_login_exempt on public.profiles
  for each row execute function public.profiles_protect_concurrent_login_exempt();

-- 관리자·시험 계정 = 이미 30일 보관 예외로 지정된 같은 두 계정(0052). 이메일을 파일에 남기지 않는다.
update public.profiles set concurrent_login_exempt = true where retention_exempt = true;

do $$
begin
  if (select count(*) from public.profiles where concurrent_login_exempt) <> 2 then
    raise exception 'concurrent_login_exempt must be set on exactly 2 accounts';
  end if;
end $$;

-- 2. 메인 사이트 user_sessions에 기기 종류 칸
alter table public.user_sessions add column if not exists device_kind text;

-- 3. 기기 종류 판정 (lib/session/deviceKind.ts와 같은 규칙)
-- @@DEVICE_SLOT_FUNCTIONS_BEGIN@@
create or replace function public.login_device_kind(ua text) returns text
language sql immutable set search_path = '' as $$
  select case
    when ua is null or ua !~ '^Mozilla/' then 'other'
    when ua ~ '(Mobi|Android|iPhone|iPad)' then 'mobile'
    else 'pc'
  end
$$;

-- 4. 새 로그인 줄이 생길 때 같은 종류의 예전 줄 정리
create or replace function public.enforce_login_device_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_kind text;
  v_policy text;
  v_exempt boolean;
  v_removed integer := 0;
begin
  begin
    v_kind := public.login_device_kind(new.user_agent);
    if v_kind = 'other' then
      return null;
    end if;

    select s.value #>> '{}' into v_policy from public.site_settings s where s.key = 'concurrent_login_policy';
    if coalesce(v_policy, 'force_logout') <> 'force_logout' then
      return null;
    end if;

    -- 회원 정보가 없거나 예외 계정이면 건너뜀
    select p.concurrent_login_exempt into v_exempt from public.profiles p where p.id = new.user_id;
    if v_exempt is null or v_exempt then
      return null;
    end if;

    delete from auth.sessions s
    where s.user_id = new.user_id
      and s.id <> new.id
      and public.login_device_kind(s.user_agent) = v_kind;
    get diagnostics v_removed = row_count;
  exception when others then
    raise warning 'enforce_login_device_slot skipped: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end $$;

revoke all on function public.enforce_login_device_slot() from public, anon, authenticated;

drop trigger if exists trg_enforce_login_device_slot on auth.sessions;
create trigger trg_enforce_login_device_slot after insert on auth.sessions
  for each row execute function public.enforce_login_device_slot();
-- @@DEVICE_SLOT_FUNCTIONS_END@@

-- 5. 예전 user_sessions 줄 기기 종류 채우기
update public.user_sessions set device_kind = public.login_device_kind(device_info) where device_kind is null;

commit;
