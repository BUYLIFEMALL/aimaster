-- R1 후보 2판(미적용): 예약 실행 방식 표에 「회원의 Vercel 명시 선택」·「판 번호」 두 칸을 더하고, 관리자가 지정하는 이 앱 전용 「사이트 예약 허용」 저장소(표 2개 + 함수 5개)를 만든다.
-- ★ 이 파일은 후보다. supabase/migrations/ 밖에 있고 어느 DB에도 적용하지 않았다(전용 격리 시험 DB에서만 실행). 마이그레이션 번호는 Master가 스키마·점유 대조 뒤 부여한다.
-- 설계: ai-influencer-studio/docs/PLAN_20261119_R1_SCHEDULER_DEFAULT.md §13·§14. 원복: aif_r1_scheduler_rollback.sql (한 벌 — 이 파일을 고치면 원복도 함께 고친다).
--
-- 계약
--   가) 회원의 선택(실행 방식 표 aif_member_scheduler의 두 칸) — 회원이 한 일
--       platform_chosen_at : 회원이 사이트(Vercel) 예약을 직접 고른 시각(null = 고르지 않음). mode와 같은 행·같은 갱신으로만 쓴다.
--       mode_rev           : 판 번호. 방식을 쓰는 갱신은 「읽은 번호와 같을 때만」 성공하고 1 올린다.
--   나) 관리자의 허용 — 이 앱(AI 인플루언서) 전용. 다른 프로그램의 권한·등급·구독·보관 열외·내부 열람 표식과 무관하다.
--       저장: aif_platform_scheduler_allowlist(회원당 한 행, 지금 상태) + aif_platform_scheduler_allowlist_events(지정·철회마다 한 줄, 덧붙이기만 하는 이력).
--       ★ 두 표는 어떤 API 역할(anon·authenticated·service_role)에게도 직접 열려 있지 않다. 드나드는 길은 아래 함수뿐이다.
--       앱 서버(서비스 역할)가 얻는 것 — 허용 여부뿐:
--         aif_platform_scheduler_is_allowed(p_user) → boolean        「행이 있고 철회되지 않음」
--         aif_platform_scheduler_allowed_users()    → setof uuid     허용된 회원 번호 목록(사이트 예약 실행의 대상 범위용)
--         메모·지정한 사람·시각은 돌려주지 않는다. 회원 본인에게도 표를 열지 않는다(화면의 「고를 수 있음」은 앱 서버가 위 함수로 판정해 알려 준다).
--       관리자가 하는 일 — 로그인한 관리자 본인의 세션으로만:
--         aif_platform_scheduler_admin_set(p_user, p_allow, p_note) → text   'granted' | 'regranted' | 'revoked' | 'unchanged'
--         aif_platform_scheduler_admin_list()                       → 지금 상태 목록
--         aif_platform_scheduler_admin_history(p_user)              → 그 회원의 지정·철회 이력
--         ★ 누가 했는지는 인자로 받지 않는다. 함수가 요청의 로그인 신원(auth.uid())을 읽고, 그 사람이 그 순간 profiles.is_admin인지 확인한다.
--           신원이 없거나(서비스 역할 호출 포함) 관리자가 아니면 AIF_ALLOWLIST_ADMIN_ONLY로 거절한다 — 상태도 이력도 바뀌지 않는다.
--         상태 전이: (없음 → 허용 'granted') (철회됨 → 허용 'regranted') (허용 → 철회 'revoked'). 이미 그 상태면 'unchanged'이고 이력을 남기지 않는다.
--         이력: 상태가 바뀐 호출마다 한 줄 — 대상 회원 번호, 한 일, 한 사람의 번호, 시각, 메모. 고치거나 지우는 길이 없다.
--               이메일 같은 개인 식별 글자는 적지 않는다(필요성과 보관 기간이 승인되기 전에는 영속 저장하지 않는다 — Master 판정 2026-11-19).
--   다) 허용(나)과 선택(가)은 서로 다른 것이다 — 둘 다 있어야 Vercel이 유효하다. 관리자(profiles.is_admin)는 허용 표와 상관없이 허용 — 그 판정은 프로그램 코드가 한다.
--   라) 사람이 지워질 때: 허용 행은 회원(auth.users)이 지워지면 함께 지워진다. 한 사람·대상의 번호는 이력에 **참조 없이** 남는다(지정한 관리자 계정을 지워도 막히지 않고,
--       이력에는 번호만 남는다 — 지워진 계정의 번호가 누구였는지는 이 표만으로는 알 수 없다). 대안과의 대조는 PLAN §14-3·§15.
--   마) 기존 앱(운영 v1.27과 같은 공용 코드) 호환: 그 코드는 칸 이름을 적어 읽고 새 칸 없이 넣는다. 이 후보만 적용하고 코드를 올리지 않아도 동작이 바뀌지 않는다.
--
-- 권한(ACL)
--   aif_member_scheduler                    : 이 후보는 권한·정책을 바꾸지 않는다.
--   aif_platform_scheduler_allowlist(_events): public·anon·authenticated·service_role 모두 권한 없음. 행 단위 보안 켬(정책 0개).
--   is_allowed · allowed_users              : service_role만 실행.
--   admin_set · admin_list · admin_history  : authenticated만 실행(안에서 관리자 확인). service_role·anon·public 실행 불가.
--   함수는 모두 소유자 권한으로 돈다. 검색 경로는 `pg_catalog, pg_temp`로 고정한다 — 시스템 스키마만 믿고, 임시 스키마는 맨 뒤에 적어 먼저 찾아지지 않게 한다.
--   public·auth의 표와 함수는 전부 스키마 이름을 붙여 부른다(같은 이름의 임시 표나 다른 스키마의 객체가 끼어들 수 없다 — 격리 시험으로 확인).
--   소유자가 두 표와 profiles·auth.users(번호만)를 읽을 수 있어야 한다(배포 전 점검).
--
-- 보관 정책(주인님 결정 2026-11-19 채팅 「권장안대로 진행해」)
--   * 보관 기간 1년: 이력은 적힌 지 1년이 지나면 지운다. 철회된 허용 행도 철회한 지 1년이 지나면 지운다(그 회원의 지난 지정 기록이 더는 필요 없다).
--                    지금 허용 중인 행은 지우지 않는다(지금의 상태다 — 메모도 그 행과 함께 남는다).
--                    지우는 길: aif_platform_scheduler_purge_history() — 서비스 역할만 실행(이 앱의 운영 정리 작업이 부른다). 기간은 함수 안에 1년으로 고정이라 부르는 쪽이 바꿀 수 없다.
--   * 번호(UUID): 계정이 지워진 뒤에도 이력에 그대로 둔다(번호만으로는 누구인지 알 수 없다). 위 1년 정리로 함께 사라진다.
--   * 메모(note): 칸을 유지한다. 200자까지. 관리자 화면에 「개인 정보를 적지 마세요」를 표시한다(화면 쪽 몫). 보관은 그 행·그 이력 줄과 같다.
--   관리자 화면의 호출: 메인 사이트 관리자 서버가 기존 로그인 세션·관리자 확인 흐름을 그대로 쓰고, 이 관리용 함수도 **같은 관리자 본인의 세션**으로 부른다.
--                       관리자 번호를 요청 본문이나 서비스 역할의 대리 인자로 받지 않는다(Master 판정 2026-11-19).

begin;
set local lock_timeout = '10s';
-- 표가 아예 없으면 잠글 수 없다 — 그때는 여기서 멈춘다.
do $$
begin
  if to_regclass('public.aif_member_scheduler') is null then
    raise exception 'AIF_R1_APPLY_REFUSED: public.aif_member_scheduler not found — nothing changed' using errcode = 'P0001';
  end if;
end $$;
-- 확인부터 변경까지 같은 잠금 안에서 한다(그사이 다른 접속이 표 모양을 바꾸거나 행을 쓰지 못한다). 10초 안에 잠그지 못하면 아무것도 바꾸지 않고 끝난다.
lock table public.aif_member_scheduler in access exclusive mode;

-- 0. 적용 전 확인 — 대상이 기대한 모양일 때만 진행한다(멈추면 이 트랜잭션 전체가 취소된다).
do $$
begin
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
  if (select count(*) from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'id') <> 1 then
    raise exception 'AIF_R1_APPLY_REFUSED: auth.users(id) not found — nothing changed' using errcode = 'P0001';
  end if;
  if to_regclass('public.aif_platform_scheduler_allowlist') is not null or to_regclass('public.aif_platform_scheduler_allowlist_events') is not null then
    raise exception 'AIF_R1_APPLY_REFUSED: the allowlist tables already exist — nothing changed' using errcode = 'P0001';
  end if;
  if exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'aif_member_scheduler' and column_name in ('platform_chosen_at', 'mode_rev')) then
    raise exception 'AIF_R1_APPLY_REFUSED: platform_chosen_at or mode_rev already exists on public.aif_member_scheduler — nothing changed' using errcode = 'P0001';
  end if;
  if exists (select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname like 'aif\_platform\_scheduler\_%') then
    raise exception 'AIF_R1_APPLY_REFUSED: a function named aif_platform_scheduler_* already exists — nothing changed' using errcode = 'P0001';
  end if;
end $$;

-- 1. 실행 방식 표에 두 칸(기존 행: 선택 없음·판 번호 0)
alter table public.aif_member_scheduler add column platform_chosen_at timestamptz;
alter table public.aif_member_scheduler add column mode_rev integer not null default 0;
comment on column public.aif_member_scheduler.platform_chosen_at is 'R1: 회원이 사이트(Vercel) 예약을 직접 고른 시각(null = 고르지 않음). mode와 같은 갱신으로만 쓴다.';
comment on column public.aif_member_scheduler.mode_rev is 'R1: 판 번호. 방식을 쓰는 갱신은 읽은 번호와 같을 때만 성공하고 1 올린다.';

-- 2. 허용 저장소 — 지금 상태(회원당 한 행)와 이력(덧붙이기만)
create table public.aif_platform_scheduler_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid not null,
  revoked_at timestamptz,
  revoked_by uuid,
  note text,
  constraint aif_platform_scheduler_allowlist_revoke_pair check ((revoked_at is null) = (revoked_by is null)),
  constraint aif_platform_scheduler_allowlist_note_len check (note is null or char_length(note) <= 200)
);
comment on table public.aif_platform_scheduler_allowlist is 'R1: AI 인플루언서에서 사이트(Vercel) 예약을 고를 자격(관리자 지정). 허용 = 행이 있고 revoked_at이 비어 있음. API 역할에게 직접 열지 않는다 — 함수로만 드나든다.';

create table public.aif_platform_scheduler_allowlist_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null check (action in ('granted', 'regranted', 'revoked')),
  actor_id uuid not null,
  note text check (note is null or char_length(note) <= 200),
  at timestamptz not null default now()
);
create index aif_platform_scheduler_allowlist_events_user_idx on public.aif_platform_scheduler_allowlist_events (user_id, id);
create index aif_platform_scheduler_allowlist_events_at_idx on public.aif_platform_scheduler_allowlist_events (at);
comment on table public.aif_platform_scheduler_allowlist_events is 'R1: 허용 지정·철회 이력(덧붙이기만). 대상·한 사람의 번호만 참조 없이 남긴다(이메일 등은 적지 않는다) — 계정이 지워져도 이력은 남고, 계정 삭제를 막지도 않는다.';

alter table public.aif_platform_scheduler_allowlist enable row level security;
alter table public.aif_platform_scheduler_allowlist_events enable row level security;
revoke all on table public.aif_platform_scheduler_allowlist from public, anon, authenticated, service_role;
revoke all on table public.aif_platform_scheduler_allowlist_events from public, anon, authenticated, service_role;

-- 3. 앱 서버용 — 허용 여부만 돌려준다
create function public.aif_platform_scheduler_is_allowed(p_user uuid) returns boolean
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select exists (select 1 from public.aif_platform_scheduler_allowlist a where a.user_id = p_user and a.revoked_at is null);
$$;

create function public.aif_platform_scheduler_allowed_users() returns setof uuid
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select a.user_id from public.aif_platform_scheduler_allowlist a where a.revoked_at is null;
$$;

-- 4. 관리자용 — 로그인한 관리자 본인의 세션으로만(누가 했는지는 인자가 아니라 요청의 로그인 신원에서 읽는다)
create function public.aif_platform_scheduler_admin_actor() returns uuid
language plpgsql stable security definer set search_path = pg_catalog, pg_temp
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists (select 1 from public.profiles p where p.id = v_actor and p.is_admin is true) then
    raise exception 'AIF_ALLOWLIST_ADMIN_ONLY: this action needs a signed-in admin' using errcode = 'P0001';
  end if;
  return v_actor;
end $$;

create function public.aif_platform_scheduler_admin_set(p_user uuid, p_allow boolean, p_note text default null) returns text
language plpgsql security definer set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor uuid := public.aif_platform_scheduler_admin_actor();
  v_row public.aif_platform_scheduler_allowlist%rowtype;
  v_action text;
  v_inserted integer := 0;
begin
  if p_user is null or p_allow is null then
    raise exception 'AIF_ALLOWLIST_BAD_REQUEST: target member and allow flag are required' using errcode = 'P0001';
  end if;
  if p_note is not null and char_length(p_note) > 200 then
    raise exception 'AIF_ALLOWLIST_BAD_REQUEST: note is longer than 200 characters' using errcode = 'P0001';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'AIF_ALLOWLIST_TARGET_NOT_FOUND: no such member' using errcode = 'P0001';
  end if;

  -- 「넣기가 기존 행과 부딪힘」과 「그 행을 잠그고 읽기」 사이에 보관 정리가 그 행을 지울 수 있다(부딪힌 넣기는 그 행을 잠그지 않는다).
  -- 그래서 읽었는데 행이 없으면 「이미 허용」이 아니라 「행이 사라졌다」로 보고 넣기부터 다시 한다. 잠근 뒤에는 그 행을 누구도 지우지 못한다.
  for v_attempt in 1..3 loop
    if p_allow then
      -- 처음 지정: 넣어 본다. 다른 관리자가 같은 순간 먼저 넣었으면 0행 — 아래에서 그 행을 잠그고 이어 간다.
      insert into public.aif_platform_scheduler_allowlist (user_id, granted_at, granted_by, note)
        values (p_user, now(), v_actor, p_note) on conflict (user_id) do nothing;
      get diagnostics v_inserted = row_count;
      if v_inserted = 1 then
        v_action := 'granted';
        exit;
      end if;
    end if;

    select * into v_row from public.aif_platform_scheduler_allowlist a where a.user_id = p_user for update;
    if not found then
      if p_allow then
        continue;             -- 부딪혔던 행이 그사이 지워졌다 → 넣기부터 다시
      end if;
      return 'unchanged';     -- 철회할 행이 없다 = 이미 허용이 아니다
    end if;
    if p_allow then
      if v_row.revoked_at is null then
        return 'unchanged';   -- 잠근 행이 허용 중이다(확인된 사실)
      end if;
      update public.aif_platform_scheduler_allowlist
        set granted_at = now(), granted_by = v_actor, revoked_at = null, revoked_by = null, note = p_note where user_id = p_user;
      v_action := 'regranted';
    else
      if v_row.revoked_at is not null then
        return 'unchanged';
      end if;
      update public.aif_platform_scheduler_allowlist
        set revoked_at = now(), revoked_by = v_actor, note = coalesce(p_note, note) where user_id = p_user;
      v_action := 'revoked';
    end if;
    exit;
  end loop;
  if v_action is null then
    -- 세 번 모두 「부딪혔는데 읽으니 없음」이었다(계속 겹침). 거짓으로 답하지 않고 다시 시도하게 한다. 이 트랜잭션은 취소되므로 상태·이력 변화가 없다.
    raise exception 'AIF_ALLOWLIST_BUSY: could not settle the allowlist row, try again' using errcode = 'P0001';
  end if;

  insert into public.aif_platform_scheduler_allowlist_events (user_id, action, actor_id, note)
    values (p_user, v_action, v_actor, p_note);
  return v_action;
end $$;

create function public.aif_platform_scheduler_admin_list()
returns table (user_id uuid, allowed boolean, granted_at timestamptz, granted_by uuid, revoked_at timestamptz, revoked_by uuid, note text)
language plpgsql stable security definer set search_path = pg_catalog, pg_temp
as $$
begin
  perform public.aif_platform_scheduler_admin_actor();
  return query select a.user_id, a.revoked_at is null, a.granted_at, a.granted_by, a.revoked_at, a.revoked_by, a.note
    from public.aif_platform_scheduler_allowlist a order by a.granted_at desc, a.user_id;
end $$;

create function public.aif_platform_scheduler_admin_history(p_user uuid)
returns table (id bigint, action text, actor_id uuid, note text, at timestamptz)
language plpgsql stable security definer set search_path = pg_catalog, pg_temp
as $$
begin
  perform public.aif_platform_scheduler_admin_actor();
  return query select e.id, e.action, e.actor_id, e.note, e.at
    from public.aif_platform_scheduler_allowlist_events e where e.user_id = p_user order by e.id;
end $$;

-- 잠금 순서(이 후보의 모든 쓰기가 지킨다): 실행 방식 표 → 허용 표 → 이력 표.
--   관리자 지정·철회(admin_set): 허용 표의 행 → 이력 표에 한 줄.   정리(purge_history): 허용 표 → 이력 표.   원복: 세 표를 이 순서로 한꺼번에 잠근다.
-- 5. 보관 기간 정리 — 1년이 지난 이력과, 철회한 지 1년이 지난 허용 행을 지운다. 지금 허용 중인 행은 건드리지 않는다. 기간은 여기 고정이다.
create function public.aif_platform_scheduler_purge_history() returns table (events_deleted bigint, rows_deleted bigint)
language plpgsql security definer set search_path = pg_catalog, pg_temp
as $$
declare v_cutoff timestamptz := now() - interval '1 year'; v_events bigint; v_rows bigint;
begin
  -- 잠금 순서는 어디서나 같다: 허용 표 → 이력 표(관리자 지정·철회도, 원복도 이 순서로 잡는다). 순서가 엇갈리면 겹쳤을 때 서로 기다리다 멈출 수 있다.
  delete from public.aif_platform_scheduler_allowlist a where a.revoked_at is not null and a.revoked_at < v_cutoff;
  get diagnostics v_rows = row_count;
  delete from public.aif_platform_scheduler_allowlist_events e where e.at < v_cutoff;
  get diagnostics v_events = row_count;
  return query select v_events, v_rows;
end $$;

revoke all on function public.aif_platform_scheduler_purge_history() from public, anon, authenticated, service_role;
grant execute on function public.aif_platform_scheduler_purge_history() to service_role;
revoke all on function public.aif_platform_scheduler_is_allowed(uuid) from public, anon, authenticated, service_role;
revoke all on function public.aif_platform_scheduler_allowed_users() from public, anon, authenticated, service_role;
revoke all on function public.aif_platform_scheduler_admin_actor() from public, anon, authenticated, service_role;
revoke all on function public.aif_platform_scheduler_admin_set(uuid, boolean, text) from public, anon, authenticated, service_role;
revoke all on function public.aif_platform_scheduler_admin_list() from public, anon, authenticated, service_role;
revoke all on function public.aif_platform_scheduler_admin_history(uuid) from public, anon, authenticated, service_role;
grant execute on function public.aif_platform_scheduler_is_allowed(uuid) to service_role;
grant execute on function public.aif_platform_scheduler_allowed_users() to service_role;
grant execute on function public.aif_platform_scheduler_admin_set(uuid, boolean, text) to authenticated;
grant execute on function public.aif_platform_scheduler_admin_list() to authenticated;
grant execute on function public.aif_platform_scheduler_admin_history(uuid) to authenticated;

-- 6. 적용 끝 확인
do $$
declare v_bad integer;
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
  -- 두 표: 행 단위 보안 켜짐, 정책 0개, API 역할의 표 권한 0
  select count(*) into v_bad
  from unnest(array['public.aif_platform_scheduler_allowlist', 'public.aif_platform_scheduler_allowlist_events']) t,
       unnest(array['anon', 'authenticated', 'service_role']) r
  where has_table_privilege(r, t, 'select') or has_table_privilege(r, t, 'insert') or has_table_privilege(r, t, 'update') or has_table_privilege(r, t, 'delete');
  if v_bad <> 0 then
    raise exception 'AIF_R1_APPLY_FAILED: an API role has direct table privileges on the allowlist tables' using errcode = 'P0001';
  end if;
  if exists (select 1 from pg_catalog.pg_class c where c.oid in ('public.aif_platform_scheduler_allowlist'::regclass, 'public.aif_platform_scheduler_allowlist_events'::regclass) and not c.relrowsecurity)
     or exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename in ('aif_platform_scheduler_allowlist', 'aif_platform_scheduler_allowlist_events')) then
    raise exception 'AIF_R1_APPLY_FAILED: row level security is off or a policy exists on the allowlist tables' using errcode = 'P0001';
  end if;
  -- 함수 실행 권한: 정해 둔 것과 정확히 같아야 한다
  select count(*) into v_bad
  from (values
    ('public.aif_platform_scheduler_is_allowed(uuid)', false, false, true),
    ('public.aif_platform_scheduler_allowed_users()', false, false, true),
    ('public.aif_platform_scheduler_admin_actor()', false, false, false),
    ('public.aif_platform_scheduler_admin_set(uuid, boolean, text)', false, true, false),
    ('public.aif_platform_scheduler_admin_list()', false, true, false),
    ('public.aif_platform_scheduler_admin_history(uuid)', false, true, false),
    ('public.aif_platform_scheduler_purge_history()', false, false, true)
  ) as want(fn, w_anon, w_auth, w_service)
  where has_function_privilege('anon', want.fn, 'execute') <> want.w_anon
     or has_function_privilege('authenticated', want.fn, 'execute') <> want.w_auth
     or has_function_privilege('service_role', want.fn, 'execute') <> want.w_service;
  if v_bad <> 0 then
    raise exception 'AIF_R1_APPLY_FAILED: function execute privileges differ from the contract' using errcode = 'P0001';
  end if;
end $$;

commit;
