-- 적용됨: 2026-10-16 Codex(Windows). DB 이력 20261016100226 본문과 일치(상태 주석 제외). 재적용 금지. docs/VIP_SIGNUP_EXPIRY_HANDOFF_20261016.md 참조.
-- 0036: VIP 사용기간 = 회원 각자 가입 시점 + 1년 (2026-10-16 주인님 확정)
-- 정책: docs/ADMIN_POLICY_GUIDELINES.md 맨 위 「프로그램 사용권한 최우선 정책」
-- 1) 등급마다 만료 기준(access_start_basis)을 둔다: 'grant' = 부여한 날 + 기본 기간(골드 등 기존 방식), 'signup' = 가입일 + 기본 기간(VIP)
-- 2) 자동 부여 함수·트리거 3개가 이 기준을 쓰도록 바꾼다
-- 3) 데이터: VIP 회원의 수동 권한 중 VIP 등급 프로그램에 해당하는 것을 백업 후 (삭제하지 않고) 등급 권한으로 전환하고, 빠진 등급 권한을 채운다
--    (VIP 등급 표에 없는 프로그램의 수동 권한은 남긴다), 기존 VIP 등급 권한 만료일을 가입일 + 365일로 맞춘다
-- 프리미엄 가드(0031)는 그대로 — 프리미엄 정지 행은 만료일 대신 premium_prev_expires_at만 맞춘다.

-- Windows 검수: 적용 시점의 비VIP/대상 밖 수동 권한 지문을 보관한다.
-- apply_migration의 단일 트랜잭션 안에서 아래 사후 검증이 실패하면 전체가 롤백된다.
create temporary table vip_0036_guard on commit drop as
select 'nonvip'::text as scope, count(*) as row_count,
       md5(string_agg(md5(to_jsonb(a)::text), '' order by a.id)) as fingerprint
from public.user_program_access a
where not exists (select 1 from public.profiles p join public.member_grades g on g.id=p.grade_id
                  where p.id=a.user_id and g.name like 'VIP%')
union all
select 'outside_manual', count(*), md5(string_agg(md5(to_jsonb(a)::text), '' order by a.id))
from public.user_program_access a join public.profiles p on p.id=a.user_id
join public.member_grades g on g.id=p.grade_id
where g.name like 'VIP%' and coalesce(a.grant_source,'') <> 'grade'
and not exists (select 1 from public.grade_program_access ga
                where ga.grade_id=g.id and ga.program_id=a.program_id and ga.can_access);

-- ── 백업 (RLS 켬, 서비스 롤 전용) ─────────────────────────────
create table if not exists public.backup_vip_manual_grants_20261016 as
  select a.* from public.user_program_access a
  join public.profiles p on p.id = a.user_id
  join public.member_grades g on g.id = p.grade_id
  where g.name like 'VIP%' and coalesce(a.grant_source, '') <> 'grade';
alter table public.backup_vip_manual_grants_20261016 enable row level security;
revoke all on public.backup_vip_manual_grants_20261016 from public, anon, authenticated;
grant select on public.backup_vip_manual_grants_20261016 to service_role;

create table if not exists public.backup_vip_grade_grants_20261016 as
  select a.* from public.user_program_access a
  join public.profiles p on p.id = a.user_id
  join public.member_grades g on g.id = p.grade_id
  where g.name like 'VIP%' and a.grant_source = 'grade';
alter table public.backup_vip_grade_grants_20261016 enable row level security;
revoke all on public.backup_vip_grade_grants_20261016 from public, anon, authenticated;
grant select on public.backup_vip_grade_grants_20261016 to service_role;

-- ── 등급별 만료 기준 ────────────────────────────────────────
alter table public.member_grades
  add column if not exists access_start_basis text not null default 'grant'
  check (access_start_basis in ('grant', 'signup'));
comment on column public.member_grades.access_start_basis is
  '자동 부여 만료 기준: grant = 부여한 날 + default_access_days, signup = 회원 가입일(profiles.created_at) + default_access_days';
update public.member_grades set access_start_basis = 'signup' where name like 'VIP%';

create or replace function public.grade_access_expires_at(p_user_id uuid, p_days integer, p_basis text)
returns timestamptz
language sql stable security invoker set search_path = ''
as $$
  select case
    when p_days is null then null
    when p_basis = 'signup' then (select created_at from public.profiles where id = p_user_id) + make_interval(days => p_days)
    else now() + make_interval(days => p_days)
  end
$$;
revoke all on function public.grade_access_expires_at(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.grade_access_expires_at(uuid, integer, text) to service_role;

create or replace function public.grade_program_access_sync()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
DECLARE v_days integer; v_auto boolean; v_basis text;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') AND (TG_OP = 'DELETE' OR NOT NEW.can_access) THEN
    DELETE FROM user_program_access
     WHERE program_id = OLD.program_id AND grant_source = 'grade' AND granted_grade_id = OLD.grade_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.can_access THEN
    SELECT auto_grant, default_access_days, access_start_basis INTO v_auto, v_days, v_basis FROM member_grades WHERE id = NEW.grade_id;
    IF COALESCE(v_auto, false) THEN
      INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
      SELECT p.id, NEW.program_id, grade_access_expires_at(p.id, v_days, v_basis), 'grade', NEW.grade_id
        FROM profiles p WHERE p.grade_id = NEW.grade_id
      ON CONFLICT (user_id, program_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

create or replace function public.profiles_grade_change_sync()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
DECLARE v_days integer; v_auto boolean; v_basis text;
BEGIN
  IF NEW.grade_id IS NOT DISTINCT FROM OLD.grade_id THEN RETURN NULL; END IF;
  DELETE FROM user_program_access
   WHERE user_id = NEW.id AND grant_source = 'grade' AND granted_grade_id IS NOT DISTINCT FROM OLD.grade_id;
  IF NEW.grade_id IS NOT NULL THEN
    SELECT auto_grant, default_access_days, access_start_basis INTO v_auto, v_days, v_basis FROM member_grades WHERE id = NEW.grade_id;
    IF COALESCE(v_auto, false) THEN
      INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
      SELECT NEW.id, a.program_id, grade_access_expires_at(NEW.id, v_days, v_basis), 'grade', NEW.grade_id
        FROM grade_program_access a WHERE a.grade_id = NEW.grade_id AND a.can_access
      ON CONFLICT (user_id, program_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

create or replace function public.apply_grade_programs(p_grade_id uuid)
returns integer language plpgsql security definer set search_path to 'public'
as $function$
DECLARE v_days integer; v_auto boolean; v_basis text; v_count integer;
BEGIN
  SELECT auto_grant, default_access_days, access_start_basis INTO v_auto, v_days, v_basis FROM member_grades WHERE id = p_grade_id;
  IF NOT COALESCE(v_auto, false) THEN RETURN 0; END IF;
  INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
  SELECT p.id, a.program_id, grade_access_expires_at(p.id, v_days, v_basis), 'grade', p_grade_id
    FROM profiles p JOIN grade_program_access a ON a.grade_id = p_grade_id AND a.can_access
   WHERE p.grade_id = p_grade_id
  ON CONFLICT (user_id, program_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- ── 데이터 정리 (VIP) ──────────────────────────────────────
-- (1) VIP 등급 프로그램에 해당하는 VIP 회원의 수동 권한을 삭제하지 않고 등급 권한으로 전환 (백업 완료)
--     행은 그대로 두고 출처만 'grade'로 바꾸며, 만료일은 아래 (3)에서 가입일 + 365일로 맞춘다.
update public.user_program_access a
   set grant_source = 'grade', granted_grade_id = g.id
  from public.profiles p, public.member_grades g
 where p.id = a.user_id and g.id = p.grade_id and g.name like 'VIP%'
   and coalesce(a.grant_source, '') <> 'grade'
   and exists (select 1 from public.grade_program_access ga
               where ga.grade_id = g.id and ga.program_id = a.program_id and ga.can_access);

-- (2) 빠진 VIP 등급 권한 채우기 (가입일 + 365일)
select public.apply_grade_programs(id) from public.member_grades where name like 'VIP%';

-- (3) 기존 VIP 등급 권한 만료일을 가입일 + 365일로
update public.user_program_access a
   set expires_at = p.created_at + make_interval(days => g.default_access_days)
  from public.profiles p, public.member_grades g
 where p.id = a.user_id and g.id = p.grade_id and g.name like 'VIP%'
   and a.grant_source = 'grade' and a.granted_grade_id = g.id
   and a.premium_suspended = false and g.default_access_days is not null;

update public.user_program_access a
   set premium_prev_expires_at = p.created_at + make_interval(days => g.default_access_days)
  from public.profiles p, public.member_grades g
 where p.id = a.user_id and g.id = p.grade_id and g.name like 'VIP%'
   and a.grant_source = 'grade' and a.granted_grade_id = g.id
   and a.premium_suspended = true and g.default_access_days is not null;

-- ── 사후 불변조건: 실패하면 마이그레이션 전체 롤백 ────────────────
do $$
declare v_count bigint; v_fingerprint text; v_guard record;
begin
  select * into v_guard from vip_0036_guard where scope='nonvip';
  select count(*), md5(string_agg(md5(to_jsonb(a)::text), '' order by a.id))
    into v_count, v_fingerprint from public.user_program_access a
    where not exists (select 1 from public.profiles p join public.member_grades g on g.id=p.grade_id
                      where p.id=a.user_id and g.name like 'VIP%');
  if v_count <> v_guard.row_count or v_fingerprint is distinct from v_guard.fingerprint then
    raise exception 'Non-VIP access changed unexpectedly';
  end if;
  select * into v_guard from vip_0036_guard where scope='outside_manual';
  select count(*), md5(string_agg(md5(to_jsonb(a)::text), '' order by a.id))
    into v_count, v_fingerprint from public.user_program_access a
    join public.profiles p on p.id=a.user_id join public.member_grades g on g.id=p.grade_id
    where g.name like 'VIP%' and coalesce(a.grant_source,'') <> 'grade'
      and not exists (select 1 from public.grade_program_access ga
                      where ga.grade_id=g.id and ga.program_id=a.program_id and ga.can_access);
  if v_count <> v_guard.row_count or v_fingerprint is distinct from v_guard.fingerprint then
    raise exception 'Out-of-matrix manual access changed unexpectedly';
  end if;
  if exists (
    select 1 from public.backup_vip_manual_grants_20261016 b
    where not exists (select 1 from public.user_program_access a where a.id=b.id)
  ) or exists (
    select 1 from public.backup_vip_grade_grants_20261016 b
    where not exists (select 1 from public.user_program_access a where a.id=b.id)
  ) then raise exception 'An original VIP access row was lost'; end if;
  if exists (
    select 1 from public.user_program_access a join public.profiles p on p.id=a.user_id
    join public.member_grades g on g.id=p.grade_id
    where g.name like 'VIP%' and a.grant_source='grade' and a.granted_grade_id=g.id
      and g.default_access_days is not null and (
        (not a.premium_suspended and a.expires_at is distinct from p.created_at+make_interval(days=>g.default_access_days)) or
        (a.premium_suspended and a.premium_prev_expires_at is distinct from p.created_at+make_interval(days=>g.default_access_days))
      )
  ) then raise exception 'VIP expiry does not match signup policy'; end if;
end $$;
