-- naver-cafe-recruit 대상 처리 함수 ncr_dispatch (2026-11-05 맥미니 초안 → 윈도우 검토 보완)
-- 모든 읽기·쓰기는 이 함수로만(service_role). 회원별 advisory lock, NCR_* 예외.
-- 모드: A 추출(extract)·B 아는 사람(known)은 targets_add 로 모음, C 홍보 글은 naver-cafe-poster 재사용(여기 없음).
-- 실제 네이버 접속(수집·초대)은 회원 PC 확장이 회원 로그인 세션에서. 이 함수는 명단·설정·결과만 다룬다.
-- 윈도우 검토(2026-11-05) 보완:
--  1) 하루 상한을 한국 날짜로 센다(이전: UTC 자정 기준).
--  2) 초대 「전에」 next_target 으로 상한·시간대·중복을 확인한다(이전: 보낸 뒤에만 확인 → 이미 보낸 초대를 기록하지 못할 수 있었음).
--  3) 이미 「보냄」인 기록은 덮어쓰지 않는다(같은 사람 중복 초대 방지 근거 유지).
--  4) 30일 정리를 모든 회원에 대해 매일 돌리는 ncr_cleanup() 추가(이전: 그 회원이 다시 접속해야만 지워짐).
--  5) 아이디 형식·한 번에 넣는 줄 수(200)·목록 수(500)·설정 범위 검사.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

create or replace function public.ncr_dispatch(p_user_id uuid, p_operation text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_now timestamptz:=clock_timestamp();
 v_day_start timestamptz:=(((clock_timestamp() at time zone 'Asia/Seoul')::date)::timestamp at time zone 'Asia/Seoul');
 v_minute int:=extract(hour from clock_timestamp() at time zone 'Asia/Seoul')::int*60+extract(minute from clock_timestamp() at time zone 'Asia/Seoul')::int;
 v_result jsonb; s public.ncr_settings; t public.ncr_targets;
 v_cap int; v_used int; r jsonb; v_mode text; v_ins int:=0; v_skip int:=0; v_cafe text;
begin
 if p_user_id is null or jsonb_typeof(coalesce(p_payload,'{}'::jsonb)) is distinct from 'object' then raise exception 'NCR_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 80551));

 -- 그 회원의 만료분은 바로 지운다(전체 정리는 ncr_cleanup이 매일). 열외 계정은 기한이 9999라 안 지워짐.
 delete from public.ncr_targets where user_id=p_user_id and expires_at<=v_now;
 delete from public.ncr_sent    where user_id=p_user_id and expires_at<=v_now;
 select * into s from public.ncr_settings where user_id=p_user_id;
 v_cap:=coalesce(s.daily_cap,20);
 select count(*) into v_used from public.ncr_sent where user_id=p_user_id and result='sent' and sent_at>=v_day_start;

 if p_operation='settings_get' then
  -- 저장 전에는 레코드가 비어 있어도 to_jsonb가 「모든 값 null」 객체를 만들므로 user_id로 가린다.
  return (case when s.user_id is not null then to_jsonb(s) else jsonb_build_object('user_id',p_user_id,'mode_known',true,'mode_promo',true,'mode_extract',false,
   'daily_cap',20,'active_start_minute',540,'active_end_minute',1320,'extract_consent_at',null) end)
   ||jsonb_build_object('used_today',v_used);

 elsif p_operation='settings_save' then
  if coalesce((p_payload->>'daily_cap')::int,20) not between 1 and 25
   or coalesce((p_payload->>'active_start_minute')::int,540) not between 0 and 1439
   or coalesce((p_payload->>'active_end_minute')::int,1320) not between 0 and 1439 then raise exception 'NCR_INPUT'; end if;
  insert into public.ncr_settings(user_id,mode_known,mode_promo,mode_extract,extract_consent_at,daily_cap,active_start_minute,active_end_minute,updated_at)
  values(p_user_id,
   coalesce((p_payload->>'mode_known')::boolean,true),
   coalesce((p_payload->>'mode_promo')::boolean,true),
   coalesce((p_payload->>'mode_extract')::boolean,false),
   case when (p_payload->>'mode_extract')::boolean and (p_payload->>'consent')::boolean then v_now else null end,
   coalesce((p_payload->>'daily_cap')::int,20),
   coalesce((p_payload->>'active_start_minute')::int,540),
   coalesce((p_payload->>'active_end_minute')::int,1320), v_now)
  on conflict(user_id) do update set
   mode_known=excluded.mode_known, mode_promo=excluded.mode_promo,
   mode_extract=excluded.mode_extract,
   extract_consent_at=case when excluded.mode_extract and public.ncr_settings.extract_consent_at is null
                            and (p_payload->>'consent')::boolean then v_now
                           when not excluded.mode_extract then null
                           else public.ncr_settings.extract_consent_at end,
   daily_cap=excluded.daily_cap, active_start_minute=excluded.active_start_minute,
   active_end_minute=excluded.active_end_minute, updated_at=v_now;
  -- 모드 A는 책임 고지 동의가 있어야 켜진다(없으면 저장 전체를 되돌림)
  if coalesce((p_payload->>'mode_extract')::boolean,false)
     and not exists(select 1 from public.ncr_settings where user_id=p_user_id and extract_consent_at is not null)
  then raise exception 'NCR_EXTRACT_CONSENT_REQUIRED'; end if;
  return jsonb_build_object('ok',true);

 elsif p_operation='targets_add' then
  -- 모드 A(extract)·B(known)이 모은 대상 여러 줄을 넣는다(중복·형식 오류 아이디는 건너뜀).
  v_mode:=p_payload->>'source_mode';
  if v_mode is null or v_mode not in ('extract','known') or jsonb_typeof(p_payload->'rows') is distinct from 'array'
   or jsonb_array_length(p_payload->'rows')>200 then raise exception 'NCR_INPUT'; end if;
  if v_mode='known' and not coalesce(s.mode_known,true) then raise exception 'NCR_MODE_OFF'; end if;
  if v_mode='extract' and not exists(select 1 from public.ncr_settings where user_id=p_user_id and mode_extract and extract_consent_at is not null)
   then raise exception 'NCR_EXTRACT_NOT_ENABLED'; end if;
  for r in select * from jsonb_array_elements(p_payload->'rows') loop
   if coalesce(r->>'naver_id','') !~ '^[a-z0-9_-]{3,30}$' then v_skip:=v_skip+1; continue; end if;
   insert into public.ncr_targets(user_id,source_mode,naver_id,nickname,member_grade,cafe_id,board_name,article_title)
   values(p_user_id,v_mode, r->>'naver_id', left(r->>'nickname',100), left(r->>'member_grade',50),
          left(r->>'cafe_id',30), left(r->>'board_name',100), left(r->>'article_title',200))
   on conflict(user_id,naver_id) do nothing;
   if found then v_ins:=v_ins+1; else v_skip:=v_skip+1; end if;
  end loop;
  return jsonb_build_object('ok',true,'added',v_ins,'skipped',v_skip);

 elsif p_operation='targets_list' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_result
   from (select * from public.ncr_targets where user_id=p_user_id order by created_at desc limit 500) x;
  return jsonb_build_object('targets',v_result);

 elsif p_operation in ('target_review','target_skip') then
  update public.ncr_targets set state=case when p_operation='target_review' then 'reviewed' else 'skipped' end
   where user_id=p_user_id and id=(p_payload->>'id')::uuid and state<>case when p_operation='target_review' then 'reviewed' else 'skipped' end;
  if not found and not exists(select 1 from public.ncr_targets where user_id=p_user_id and id=(p_payload->>'id')::uuid) then raise exception 'NCR_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true);

 elsif p_operation='targets_review_all' then
  -- 「이 목록 승인」 한 번: 초안 상태인 대상을 모두 검토 완료로(빼고 싶은 것은 먼저 target_skip).
  update public.ncr_targets set state='reviewed' where user_id=p_user_id and state='draft';
  get diagnostics v_ins=row_count;
  return jsonb_build_object('ok',true,'reviewed',v_ins);

 elsif p_operation='next_target' then
  -- 확장이 초대하기 「전에」 부른다: 시간대·하루 상한·이미 보낸 사람을 서버가 먼저 거른다.
  v_cafe:=p_payload->>'cafe_id';
  if coalesce(v_cafe,'') !~ '^[A-Za-z0-9_-]{1,30}$' then raise exception 'NCR_INPUT'; end if;
  if not (coalesce(s.active_start_minute,540)=coalesce(s.active_end_minute,1320)
    or (coalesce(s.active_start_minute,540)<coalesce(s.active_end_minute,1320) and v_minute>=coalesce(s.active_start_minute,540) and v_minute<coalesce(s.active_end_minute,1320))
    or (coalesce(s.active_start_minute,540)>coalesce(s.active_end_minute,1320) and (v_minute>=coalesce(s.active_start_minute,540) or v_minute<coalesce(s.active_end_minute,1320))))
   then return jsonb_build_object('phase','waiting','reason','outside_window','used',v_used,'cap',v_cap); end if;
  if v_used>=v_cap then return jsonb_build_object('phase','waiting','reason','daily_cap','used',v_used,'cap',v_cap); end if;
  if exists(select 1 from public.ncr_sent where user_id=p_user_id and result='limited' and sent_at>=v_day_start)
   then return jsonb_build_object('phase','waiting','reason','limited_today','used',v_used,'cap',v_cap); end if;
  select * into t from public.ncr_targets x where x.user_id=p_user_id and x.state='reviewed'
   and not exists(select 1 from public.ncr_sent y where y.user_id=p_user_id and y.cafe_id=v_cafe and y.naver_id=x.naver_id)
   order by x.created_at, x.id limit 1;
  if not found then return jsonb_build_object('phase','idle','reason','no_reviewed_target','used',v_used,'cap',v_cap); end if;
  return jsonb_build_object('phase','invite','id',t.id,'naver_id',t.naver_id,'used',v_used,'cap',v_cap);

 elsif p_operation='sent_mark' then
  -- 확장이 초대 화면에서 확인한 결과를 기록한다(이미 보낸 일을 잃지 않도록 상한과 상관없이 기록).
  -- 「limited」(네이버 제한 문구)가 기록되면 그날은 next_target이 더 내주지 않는다.
  v_cafe:=p_payload->>'cafe_id';
  if coalesce(v_cafe,'') !~ '^[A-Za-z0-9_-]{1,30}$' or coalesce(p_payload->>'naver_id','') !~ '^[a-z0-9_-]{3,30}$'
   or coalesce(p_payload->>'result','') not in ('sent','failed','limited') then raise exception 'NCR_INPUT'; end if;
  insert into public.ncr_sent(user_id,cafe_id,naver_id,result,detail)
  values(p_user_id, v_cafe, p_payload->>'naver_id', p_payload->>'result', left(p_payload->>'detail',200))
  on conflict(user_id,cafe_id,naver_id) do update set result=excluded.result, detail=excluded.detail, sent_at=v_now
   where public.ncr_sent.result<>'sent';
  return jsonb_build_object('ok',true,'used',v_used+(case when (p_payload->>'result')='sent' then 1 else 0 end),'cap',v_cap);

 elsif p_operation='sent_list' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.sent_at desc),'[]'::jsonb) into v_result
   from (select * from public.ncr_sent where user_id=p_user_id order by sent_at desc limit 500) x;
  return jsonb_build_object('sent',v_result,'used_today',v_used,'cap',v_cap);

 else
  raise exception 'NCR_UNKNOWN_OP';
 end if;
end $$;

revoke all on function public.ncr_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.ncr_dispatch(uuid,text,jsonb) to service_role;

-- 매일 30일 정리(모든 회원). 열외 계정은 기한이 9999라 지워지지 않는다. 한 번에 5천 줄씩.
create or replace function public.ncr_cleanup() returns jsonb
language plpgsql security definer set search_path='' as $$
declare n1 int; n2 int;
begin
 with d as (select id from public.ncr_targets where expires_at<=clock_timestamp() order by expires_at limit 5000)
  delete from public.ncr_targets x using d where x.id=d.id;
 get diagnostics n1=row_count;
 with d as (select id from public.ncr_sent where expires_at<=clock_timestamp() order by expires_at limit 5000)
  delete from public.ncr_sent x using d where x.id=d.id;
 get diagnostics n2=row_count;
 return jsonb_build_object('targetsRemoved',n1,'sentRemoved',n2);
end $$;
revoke all on function public.ncr_cleanup() from public,anon,authenticated;
grant execute on function public.ncr_cleanup() to service_role;
commit;
