-- R1 후보(미적용): 예약 실행 방식 표에 「회원의 Vercel 명시 선택」·「판 번호」 두 칸을 더하고, 관리자가 지정하는 이 앱 전용 「사이트 예약 허용」 표를 만든다.
-- ★ 이 파일은 후보다. supabase/migrations/ 밖에 있고 어느 DB에도 적용하지 않았다(전용 격리 시험 DB에서만 실행). 마이그레이션 번호는 Master가 스키마·점유 대조 뒤 부여한다.
-- 설계: ai-influencer-studio/docs/PLAN_20261119_R1_SCHEDULER_DEFAULT.md §12-5·§13. 원복: aif_r1_scheduler_rollback.sql (한 벌 — 이 파일을 고치면 원복도 함께 고친다).
--
-- 계약
--   가) 회원의 선택(실행 방식 표 aif_member_scheduler의 두 칸) — 회원이 한 일
--       platform_chosen_at : 회원이 사이트(Vercel) 예약을 직접 고른 시각(null = 고르지 않음). mode와 같은 행·같은 갱신으로만 쓴다.
--       mode_rev           : 판 번호. 방식을 쓰는 갱신은 「읽은 번호와 같을 때만」 성공하고 1 올린다(겹친 요청이 서로의 쓰기를 덮지 않게).
--                            번호의 적용: 프로그램이 이 칸을 읽고 조건에 쓰기 시작한 뒤부터 뜻이 있다. 철회(원복): 칸을 지우면 프로그램은 값 비교로 돌아가지 않는다 —
--                            프로그램 코드를 이 칸을 읽지 않는 판으로 먼저 되돌린 뒤 지운다(순서는 원복 파일 머리말).
--   나) 관리자의 허용(새 표 aif_platform_scheduler_allowlist) — 관리자가 한 일. 이 앱(AI 인플루언서) 전용이다. 다른 프로그램의 권한·등급·구독·보관 열외와 무관하다.
--       회원 식별 : user_id(회원당 한 행, auth.users 참조, 회원이 지워지면 함께 지워진다).
--       지정      : 행을 넣거나(처음) 고친다 — granted_by(관리자), granted_at, note. 철회 칸은 비운다.
--       철회      : 행을 지우지 않고 revoked_at·revoked_by를 적는다(누가 언제 철회했는지 남긴다). 다시 지정하면 철회 칸을 비운다.
--       판정      : 「행이 있고 revoked_at이 비어 있음」 = 허용. 관리자(profiles.is_admin)는 이 표와 상관없이 허용 — 그 판정은 프로그램 코드가 한다.
--       변경 주체 : 관리자만. 회원 쓰기 정책이 없고(읽기만), 쓰기는 서비스 역할(메인 사이트 관리자 화면의 서버)만 한다.
--                   그리고 표 자체가 확인한다 — 지정·철회에 적힌 사람이 그 시점에 관리자(profiles.is_admin)가 아니면 쓰기를 거절한다.
--       앱 서버   : 이 앱의 서버(서비스 역할)는 허용 여부를 읽기만 한다. 이 앱은 이 표에 쓰지 않는다.
--   다) 둘은 서로 다른 것이다 — 허용(나)만으로 Vercel이 켜지지 않고, 선택(가)만으로도 켜지지 않는다. 둘 다 있어야 유효하다.
--   라) 기존 앱(운영 v1.27과 같은 공용 코드) 호환: 그 코드는 칸 이름을 적어 읽고(user_id, mode, active, paused …) 새 칸 없이 넣는다.
--       새 칸은 비어도 되거나 기본값이 있어 그 코드의 조회·넣기·고치기가 그대로 된다(격리 시험으로 확인). 이 후보만 적용하고 코드를 올리지 않아도 동작이 바뀌지 않는다.
--
-- 권한(ACL)
--   aif_member_scheduler            : 이 후보는 권한·정책을 바꾸지 않는다(기존: 회원 본인 행 읽기 정책 1개, 쓰기 정책 없음).
--   aif_platform_scheduler_allowlist: public·anon 권한 없음 / authenticated select만(정책: 본인 행) / service_role select·insert·update(삭제 권한 없음 — 철회는 고치기).

begin;

-- 0. 적용 전 확인 — 대상이 기대한 모양일 때만 진행한다(멈추면 이 트랜잭션 전체가 취소된다).
do $$
begin
  if to_regclass('public.aif_member_scheduler') is null then
    raise exception 'AIF_R1_APPLY_REFUSED: public.aif_member_scheduler not found — nothing changed' using errcode = 'P0001';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'aif_member_scheduler' and column_name in ('user_id', 'mode', 'active', 'paused')) <> 4 then
    raise exception 'AIF_R1_APPLY_REFUSED: public.aif_member_scheduler does not have the expected columns — nothing changed' using errcode = 'P0001';
  end if;
  if not (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.aif_member_scheduler'::regclass) then
    raise exception 'AIF_R1_APPLY_REFUSED: row level security is off on public.aif_member_scheduler — nothing changed' using errcode = 'P0001';
  end if;
  if to_regclass('public.profiles') is null or (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name in ('id', 'is_admin')) <> 2 then
    raise exception 'AIF_R1_APPLY_REFUSED: public.profiles(id, is_admin) not found — nothing changed' using errcode = 'P0001';
  end if;
  if to_regclass('public.aif_platform_scheduler_allowlist') is not null then
    raise exception 'AIF_R1_APPLY_REFUSED: public.aif_platform_scheduler_allowlist already exists — nothing changed' using errcode = 'P0001';
  end if;
  if exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'aif_member_scheduler' and column_name in ('platform_chosen_at', 'mode_rev')) then
    raise exception 'AIF_R1_APPLY_REFUSED: platform_chosen_at or mode_rev already exists on public.aif_member_scheduler — nothing changed' using errcode = 'P0001';
  end if;
end $$;

-- 1. 실행 방식 표에 두 칸(기존 행: 선택 없음·판 번호 0)
alter table public.aif_member_scheduler add column platform_chosen_at timestamptz;
alter table public.aif_member_scheduler add column mode_rev integer not null default 0;
comment on column public.aif_member_scheduler.platform_chosen_at is 'R1: 회원이 사이트(Vercel) 예약을 직접 고른 시각(null = 고르지 않음). mode와 같은 갱신으로만 쓴다.';
comment on column public.aif_member_scheduler.mode_rev is 'R1: 판 번호. 방식을 쓰는 갱신은 읽은 번호와 같을 때만 성공하고 1 올린다.';

-- 2. 관리자가 지정하는 이 앱 전용 「사이트 예약 허용」 표
create table public.aif_platform_scheduler_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  note text,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete restrict,
  constraint aif_platform_scheduler_allowlist_revoke_pair check ((revoked_at is null) = (revoked_by is null))
);
comment on table public.aif_platform_scheduler_allowlist is 'R1: 관리자가 지정한, AI 인플루언서에서 사이트(Vercel) 예약을 고를 자격이 있는 회원. 허용 = 행이 있고 revoked_at이 비어 있음. 쓰기는 서비스 역할만, 적힌 사람은 관리자여야 한다.';

-- 지정·철회에 적힌 사람이 그 시점에 관리자인지 표가 확인한다(서비스 역할로 쓰더라도).
create function public.aif_platform_scheduler_allowlist_guard() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' or new.granted_by is distinct from old.granted_by or new.granted_at is distinct from old.granted_at then
    if not exists (select 1 from public.profiles p where p.id = new.granted_by and p.is_admin is true) then
      raise exception 'AIF_ALLOWLIST_ADMIN_ONLY: granted_by is not an admin' using errcode = 'P0001';
    end if;
  end if;
  if new.revoked_by is not null and (tg_op = 'INSERT' or new.revoked_by is distinct from old.revoked_by or new.revoked_at is distinct from old.revoked_at) then
    if not exists (select 1 from public.profiles p where p.id = new.revoked_by and p.is_admin is true) then
      raise exception 'AIF_ALLOWLIST_ADMIN_ONLY: revoked_by is not an admin' using errcode = 'P0001';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'AIF_ALLOWLIST_ADMIN_ONLY: user_id cannot be changed' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.aif_platform_scheduler_allowlist_guard() from public, anon, authenticated;
create trigger aif_platform_scheduler_allowlist_guard before insert or update on public.aif_platform_scheduler_allowlist
  for each row execute function public.aif_platform_scheduler_allowlist_guard();

alter table public.aif_platform_scheduler_allowlist enable row level security;
create policy aif_platform_scheduler_allowlist_select_own on public.aif_platform_scheduler_allowlist for select to authenticated using (auth.uid() = user_id);
revoke all on table public.aif_platform_scheduler_allowlist from public, anon, authenticated, service_role;
grant select on table public.aif_platform_scheduler_allowlist to authenticated;
grant select, insert, update on table public.aif_platform_scheduler_allowlist to service_role;

-- 3. 적용 끝 확인
do $$
begin
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'aif_member_scheduler'
        and ((column_name = 'platform_chosen_at' and data_type = 'timestamp with time zone' and is_nullable = 'YES')
          or (column_name = 'mode_rev' and data_type = 'integer' and is_nullable = 'NO'))) <> 2 then
    raise exception 'AIF_R1_APPLY_FAILED: the two columns are not in the expected shape' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.aif_member_scheduler where platform_chosen_at is not null or mode_rev <> 0) then
    raise exception 'AIF_R1_APPLY_FAILED: existing rows did not start empty (choice null, revision 0)' using errcode = 'P0001';
  end if;
  if not (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.aif_platform_scheduler_allowlist'::regclass) then
    raise exception 'AIF_R1_APPLY_FAILED: row level security is off on the allowlist table' using errcode = 'P0001';
  end if;
  if (select count(*) from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'aif_platform_scheduler_allowlist') <> 1 then
    raise exception 'AIF_R1_APPLY_FAILED: unexpected policies on the allowlist table' using errcode = 'P0001';
  end if;
  if has_table_privilege('authenticated', 'public.aif_platform_scheduler_allowlist', 'insert, update, delete')
     or has_table_privilege('anon', 'public.aif_platform_scheduler_allowlist', 'select, insert, update, delete')
     or has_table_privilege('service_role', 'public.aif_platform_scheduler_allowlist', 'delete') then
    raise exception 'AIF_R1_APPLY_FAILED: table privileges on the allowlist are wider than intended' using errcode = 'P0001';
  end if;
end $$;

commit;
