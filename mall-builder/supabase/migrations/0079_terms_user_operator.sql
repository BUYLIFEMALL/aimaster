-- AI 쇼핑몰 빌더 — 용어 통일(2026-11-15 주인님 지시, HANDOFF_20261115_TERMS.md): DB 함수 안 문구(오류·알림·기본 표시)의
-- 「손님」 → 「유저」(조사 맞춤: 이→가·은→는·을→를·과→와·으로→로), 「운영자」 → 「운영사」.
-- 함수를 손으로 다시 쓰지 않고, 그 DB에 지금 있는 정의(pg_get_functiondef)를 읽어 글자만 바꿔 다시 만든다
-- → 운영·Lab 어느 DB에서도 그 DB의 최신 로직이 그대로 유지된다. 두 단어는 문구에만 쓰이고 비교 값으로는 쓰이지 않음(2026-11-15 Lab 확인).
-- 표·자료는 손대지 않는다(이미 저장된 기록 문구는 그대로). 여러 번 실행해도 같다(바꿀 글자가 없으면 건너뜀).
do $$
declare
  f record;
  d text;
  n int := 0;
begin
  for f in
    select p.oid
      from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
     where p.prokind = 'f'
       and (ns.nspname = 'mall_builder_private' or (ns.nspname = 'public' and p.proname like 'mall\_builder%'))
       and p.prosrc ~ '손님|운영자'
  loop
    d := pg_get_functiondef(f.oid);
    d := replace(d, '손님으로', '유저로');
    d := regexp_replace(d, '손님이([^가-힣])', '유저가\1', 'g');
    d := regexp_replace(d, '손님은([^가-힣])', '유저는\1', 'g');
    d := regexp_replace(d, '손님을([^가-힣])', '유저를\1', 'g');
    d := regexp_replace(d, '손님과([^가-힣])', '유저와\1', 'g');
    d := replace(d, '손님', '유저');
    d := replace(d, '운영자', '운영사');
    execute d;
    n := n + 1;
  end loop;
  raise notice '용어 통일: 함수 %개 다시 만듦', n;
end;
$$;
