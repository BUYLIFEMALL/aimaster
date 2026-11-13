-- 회원 본인 카카오 앱 JavaScript 키(provider kakao_js_key) 허용 (2026-11-13 [역할: policy])
-- 주인님 지시: 「규칙대로 바꿔 각각 본인 키를 등록해서 사용해야되」 — 카카오톡 뉴스레터 자동화(kakao_auto_poster)의
-- 「카카오톡 공유」 버튼이 운영자 카카오 앱 키(NEXT_PUBLIC_KAKAO_JS_KEY)를 쓰던 것을 회원 본인 키로 바꾼다(최상위 규칙).
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 기존 허용 값은 그대로 두고 kakao_js_key 하나만 추가한다(데이터 변경 없음).
-- 되돌리기: kakao_js_key 행이 없을 때, 같은 방식으로 목록에서 kakao_js_key를 뺀 제약으로 다시 만든다.
do $$
declare c text; def text;
begin
  select conname, pg_get_constraintdef(oid) into c, def from pg_constraint
  where conrelid = 'public.user_api_keys'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%provider%' limit 1;
  if c is null then raise exception 'provider check constraint not found'; end if;
  if def like '%kakao_js_key%' then return; end if;
  execute format('alter table public.user_api_keys drop constraint %I', c);
  execute format('alter table public.user_api_keys add constraint %I %s', c, replace(def, 'kakao_client_secret,', 'kakao_client_secret,kakao_js_key,'));
end $$;
