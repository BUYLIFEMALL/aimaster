-- R1 후보 2판의 원복(미적용): aif_r1_scheduler_candidate.sql이 더한 두 칸·허용 표 2개·함수 7개를 없앤다. 한 벌이다 — 적용 파일을 고치면 이 파일도 함께 고친다.
-- ★ 순서: 먼저 프로그램 코드를 「이 칸·표·함수를 쓰지 않는 판」으로 되돌린 뒤 이 파일을 실행한다.
--    쓰는 코드가 남은 채 지우면 그 프로그램의 행 조회·허용 조회가 실패한다(그 프로그램은 실패를 「Vercel 차단」으로 처리하지만 예약 방식 화면도 함께 실패한다).
--    판 번호의 철회: mode_rev를 지우면 프로그램은 값 비교로 저절로 돌아가지 않는다 — 코드의 연결점 설정에서 판 번호 칸을 빼는 것이 먼저다.
-- ★ 원복은 자료를 지운다(회원의 명시 선택 시각, 관리자의 지정 상태, 지정·철회 이력). 그래서 **자료가 남아 있으면 멈춘다.**
--    정말 버려도 되는지는 사람이 판단한다. 버리기로 했으면 표 소유자가 선택을 비우고 허용 표와 이력 표를 비운 뒤(이력은 따로 내보내 보관) 다시 실행한다.
--    판 번호(mode_rev) 값은 자료로 치지 않는다.
-- ★ 원복 전에 멈출 것(사람이 확인): ㉠ 보관 정리 호출 — 이 앱의 운영 정리 작업이 aif_platform_scheduler_purge_history()를 부르지 않게 먼저 끄고(코드를 되돌린 배포에 포함),
--    진행 중인 호출이 끝났는지 본다. ㉡ 관리자 화면의 지정·철회 — 원복하는 동안 쓰지 않는다.
--    멈추지 않아도 자료가 깨지지는 않는다(아래 잠금이 기다렸다가 판단한다). 다만 원복이 끝난 뒤 남은 호출은 「함수가 없다」는 오류를 낸다.
--    잠금 순서는 적용 파일의 함수들과 같다: 실행 방식 표 → 허용 표 → 이력 표.
-- ★ 잠금: 확인부터 삭제까지 **한 트랜잭션, 같은 잠금** 안에서 한다. 세 표를 먼저 잠그므로, 확인한 뒤 지우기 전에 다른 접속이 선택·지정·이력을 써넣을 수 없다.
--    쓰고 있던 접속이 있으면 그 접속이 끝날 때까지 기다렸다가(최대 10초) 그 결과를 보고 판단한다. 10초 안에 잠그지 못하면 아무것도 바꾸지 않고 오류로 끝난다.

begin;
set local lock_timeout = '10s';

-- 표가 아예 없으면 잠글 수 없다 — 그때는 「적용돼 있지 않다」로 멈춘다(잠금 전에 볼 수 있는 것만 본다).
do $$
begin
  if to_regclass('public.aif_member_scheduler') is null
     or to_regclass('public.aif_platform_scheduler_allowlist') is null
     or to_regclass('public.aif_platform_scheduler_allowlist_events') is null then
    raise exception 'AIF_R1_ROLLBACK_REFUSED: the candidate is not fully applied here (a table is missing) — nothing changed' using errcode = 'P0001';
  end if;
end $$;

lock table public.aif_member_scheduler, public.aif_platform_scheduler_allowlist, public.aif_platform_scheduler_allowlist_events in access exclusive mode;

-- 잠근 뒤의 확인 — 여기서 본 것이 지울 때까지 그대로다.
do $$
declare v_chosen bigint; v_rows bigint; v_events bigint;
begin
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'aif_member_scheduler' and column_name in ('platform_chosen_at', 'mode_rev')) <> 2
     or (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in ('aif_platform_scheduler_is_allowed', 'aif_platform_scheduler_allowed_users', 'aif_platform_scheduler_admin_actor',
           'aif_platform_scheduler_admin_set', 'aif_platform_scheduler_admin_list', 'aif_platform_scheduler_admin_history', 'aif_platform_scheduler_purge_history')) <> 7 then
    raise exception 'AIF_R1_ROLLBACK_REFUSED: the candidate is not fully applied here (columns or functions missing) — nothing changed' using errcode = 'P0001';
  end if;
  select count(*) into v_chosen from public.aif_member_scheduler where platform_chosen_at is not null;
  select count(*) into v_rows from public.aif_platform_scheduler_allowlist;
  select count(*) into v_events from public.aif_platform_scheduler_allowlist_events;
  if v_chosen <> 0 or v_rows <> 0 or v_events <> 0 then
    raise exception 'AIF_R1_ROLLBACK_REFUSED: data would be lost (% member choice(s), % allowlist row(s), % history event(s)) — clear them first if that is intended; nothing changed', v_chosen, v_rows, v_events using errcode = 'P0001';
  end if;
end $$;

drop function public.aif_platform_scheduler_purge_history();
drop function public.aif_platform_scheduler_admin_history(uuid);
drop function public.aif_platform_scheduler_admin_list();
drop function public.aif_platform_scheduler_admin_set(uuid, boolean, text);
drop function public.aif_platform_scheduler_admin_actor();
drop function public.aif_platform_scheduler_allowed_users();
drop function public.aif_platform_scheduler_is_allowed(uuid);
drop table public.aif_platform_scheduler_allowlist_events;
drop table public.aif_platform_scheduler_allowlist;
alter table public.aif_member_scheduler drop column platform_chosen_at;
alter table public.aif_member_scheduler drop column mode_rev;

commit;
