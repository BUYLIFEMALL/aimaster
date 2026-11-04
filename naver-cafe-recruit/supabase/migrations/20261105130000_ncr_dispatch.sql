-- naver-cafe-recruit 대상 처리 함수 ncr_dispatch — 초안 (2026-11-05 맥미니, 미적용)
-- 모든 읽기·쓰기는 이 함수로만(service_role). 만료 정리 먼저, 회원별 advisory lock, NCR_* 예외.
-- 모드: A 추출(extract)·B 아는 사람(known)은 targets_add 로 모음, C 홍보 글은 naver-cafe-poster 재사용(여기 없음).
-- 실제 네이버 접속(수집·초대)은 회원 PC 확장이 회원 로그인 세션에서. 이 함수는 명단·설정·결과만 다룬다.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

create or replace function public.ncr_dispatch(p_user_id uuid, p_operation text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_now timestamptz:=now();
 v_result jsonb;
 v_cap int; v_used int;
 r jsonb; v_mode text; v_ins int:=0;
begin
 if p_user_id is null then raise exception 'NCR_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 80551));

 -- 만료 정리(열외 계정은 기한이 9999라 안 지워짐)
 delete from public.ncr_targets where user_id=p_user_id and expires_at<=v_now;
 delete from public.ncr_sent    where user_id=p_user_id and expires_at<=v_now;

 if p_operation='settings_get' then
  select to_jsonb(s) into v_result from public.ncr_settings s where s.user_id=p_user_id;
  return coalesce(v_result, jsonb_build_object(
   'user_id',p_user_id,'mode_known',true,'mode_promo',true,'mode_extract',false,
   'daily_cap',20,'active_start_minute',540,'active_end_minute',1320));

 elsif p_operation='settings_save' then
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
  -- 모드 A는 동의가 있어야 켜진 것으로 본다
  if (p_payload->>'mode_extract')::boolean and not (p_payload->>'consent')::boolean
     and not exists(select 1 from public.ncr_settings where user_id=p_user_id and extract_consent_at is not null)
  then raise exception 'NCR_EXTRACT_CONSENT_REQUIRED'; end if;
  return jsonb_build_object('ok',true);

 elsif p_operation='targets_add' then
  -- 모드 A(extract)·B(known)이 모은 대상 여러 줄을 넣는다(중복 아이디는 건너뜀).
  v_mode:=p_payload->>'source_mode';
  if v_mode not in ('extract','known') then raise exception 'NCR_INPUT'; end if;
  if v_mode='extract' and not exists(select 1 from public.ncr_settings where user_id=p_user_id and mode_extract and extract_consent_at is not null)
   then raise exception 'NCR_EXTRACT_NOT_ENABLED'; end if;
  for r in select * from jsonb_array_elements(coalesce(p_payload->'rows','[]'::jsonb)) loop
   insert into public.ncr_targets(user_id,source_mode,naver_id,nickname,member_grade,cafe_id,board_name,article_title)
   values(p_user_id,v_mode, left(r->>'naver_id',60), left(r->>'nickname',100), left(r->>'member_grade',50),
          left(r->>'cafe_id',30), left(r->>'board_name',100), left(r->>'article_title',200))
   on conflict(user_id,naver_id) do nothing;
   if found then v_ins:=v_ins+1; end if;
  end loop;
  return jsonb_build_object('ok',true,'added',v_ins);

 elsif p_operation='targets_list' then
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) into v_result
   from public.ncr_targets t where t.user_id=p_user_id;
  return jsonb_build_object('targets',v_result);

 elsif p_operation='target_review' or p_operation='target_skip' then
  update public.ncr_targets set state=case when p_operation='target_review' then 'reviewed' else 'skipped' end
   where user_id=p_user_id and id=(p_payload->>'id')::uuid;
  if not found then raise exception 'NCR_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true);

 elsif p_operation='sent_mark' then
  -- 확장이 초대를 보낸 뒤 결과를 기록. 하루 상한을 넘겨 기록하지 않는다.
  select coalesce(daily_cap,20) into v_cap from public.ncr_settings where user_id=p_user_id;
  select count(*) into v_used from public.ncr_sent
   where user_id=p_user_id and result='sent' and sent_at>=date_trunc('day',v_now);
  if (p_payload->>'result')='sent' and v_used>=coalesce(v_cap,20) then raise exception 'NCR_DAILY_CAP'; end if;
  insert into public.ncr_sent(user_id,cafe_id,naver_id,result,detail)
  values(p_user_id, left(p_payload->>'cafe_id',30), left(p_payload->>'naver_id',60),
         p_payload->>'result', left(p_payload->>'detail',200))
  on conflict(user_id,cafe_id,naver_id) do update set result=excluded.result, detail=excluded.detail, sent_at=v_now;
  return jsonb_build_object('ok',true,'used',v_used+ (case when (p_payload->>'result')='sent' then 1 else 0 end),'cap',coalesce(v_cap,20));

 elsif p_operation='sent_list' then
  select coalesce(jsonb_agg(to_jsonb(s) order by s.sent_at desc),'[]'::jsonb) into v_result
   from public.ncr_sent s where s.user_id=p_user_id;
  return jsonb_build_object('sent',v_result);

 else
  raise exception 'NCR_UNKNOWN_OP';
 end if;
end $$;

revoke all on function public.ncr_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.ncr_dispatch(uuid,text,jsonb) to service_role;
commit;
