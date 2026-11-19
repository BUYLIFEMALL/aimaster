-- R1 후보의 원복(미적용): aif_r1_scheduler_candidate.sql이 더한 두 칸·허용 표·확인 함수를 없앤다. 한 벌이다 — 적용 파일을 고치면 이 파일도 함께 고친다.
-- ★ 순서: 먼저 프로그램 코드를 「이 칸·표를 읽지 않는 판」으로 되돌린 뒤 이 파일을 실행한다.
--    읽는 코드가 남은 채 지우면 그 프로그램의 행 조회·허용 조회가 실패한다(그 프로그램은 실패를 「Vercel 차단」으로 처리하지만 예약 방식 화면도 함께 실패한다).
--    판 번호의 철회: mode_rev를 지우면 프로그램은 값 비교로 저절로 돌아가지 않는다 — 코드의 연결점 설정에서 판 번호 칸을 빼는 것이 먼저다.
-- ★ 원복은 자료를 지운다(회원의 명시 선택 시각, 관리자의 지정·철회 기록). 그래서 **자료가 남아 있으면 멈춘다.**
--    정말 버려도 되는지는 사람이 판단한다. 버리기로 했으면: 선택을 비우고(update public.aif_member_scheduler set platform_chosen_at = null …) 허용 표의 행을 지운 뒤 다시 실행한다.
--    (허용 표는 서비스 역할에게 삭제 권한이 없다 — 표 소유자가 지운다.)
--    판 번호(mode_rev) 값은 자료로 치지 않는다(0이 아니어도 원복을 막지 않는다 — 선택·기록이 아니다).

begin;

do $$
declare v_chosen bigint; v_rows bigint;
begin
  if to_regclass('public.aif_member_scheduler') is null then
    raise exception 'AIF_R1_ROLLBACK_REFUSED: public.aif_member_scheduler not found — nothing changed' using errcode = 'P0001';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'aif_member_scheduler' and column_name in ('platform_chosen_at', 'mode_rev')) <> 2
     or to_regclass('public.aif_platform_scheduler_allowlist') is null
     or to_regprocedure('public.aif_platform_scheduler_allowlist_guard()') is null then
    raise exception 'AIF_R1_ROLLBACK_REFUSED: the candidate is not fully applied here (columns, allowlist table or guard function missing) — nothing changed' using errcode = 'P0001';
  end if;
  select count(*) into v_chosen from public.aif_member_scheduler where platform_chosen_at is not null;
  select count(*) into v_rows from public.aif_platform_scheduler_allowlist;
  if v_chosen <> 0 or v_rows <> 0 then
    raise exception 'AIF_R1_ROLLBACK_REFUSED: data would be lost (% member choice(s), % allowlist row(s)) — clear them first if that is intended; nothing changed', v_chosen, v_rows using errcode = 'P0001';
  end if;
end $$;

drop table public.aif_platform_scheduler_allowlist;
drop function public.aif_platform_scheduler_allowlist_guard();
alter table public.aif_member_scheduler drop column platform_chosen_at;
alter table public.aif_member_scheduler drop column mode_rev;

commit;
