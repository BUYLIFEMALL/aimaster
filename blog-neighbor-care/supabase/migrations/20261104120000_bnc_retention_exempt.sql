-- 관리자·시험 계정(profiles.retention_exempt=true) 30일 자료 정리 열외 — v1.15 (2026-11-04 주인님 지시, 요청서 §9).
-- 기준: docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md (코드에 이메일을 적지 않음, 회원 격리·RLS 그대로).
-- 방식: 매일 03:20 정리 RPC 12개와 화면 조회는 모두 「만료 시각(expires_at)이 지났는가」로 판단한다.
--   열외 회원의 「30일 보관 기한」(지금보다 20일 넘게 남은 만료 시각)만 9999-12-31로 바꿔 두면
--   정리 함수 본문을 고치지 않고도 지워지지도, 숨겨지지도 않는다(화면은 「무기한 보관」으로 표시).
-- 건드리지 않는 것: 2분~24시간짜리 실행 잠금·읽기 기한(값이 20일보다 짧아 조건에 걸리지 않음),
--   연결 기기·연결 코드·실행/수락 허가 표(보안 기한이라 대상 표에서 뺌), 이웃 가져오기 임시 목록
--   (bnc_neighbor_import_pages, 회원 칸 없음·최대 24시간 안내), 일반 회원(지금처럼 30일).
-- 감시(bnc_monitors)는 7일 감시 기한이 끝나고 30일 뒤 지우므로 그 한 줄에만 열외 조건을 넣는다.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';

create or replace function bnc_private.retention_exempt(p_user_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 return coalesce((select p.retention_exempt from public.profiles p where p.id=p_user_id),false);
end $$;
revoke all on function bnc_private.retention_exempt(uuid) from public,anon,authenticated;
grant execute on function bnc_private.retention_exempt(uuid) to service_role;

-- 소통 수신함 원본 고정은 그대로 두고, 열외 회원의 기한을 9999-12-31로 바꾸는 경우만 허용한다.
create or replace function bnc_private.guard_engagement_source() returns trigger
language plpgsql security invoker set search_path='' as $$ begin
 if row(new.user_id,new.account_id,new.actor_id,new.neighbor_id,new.own_post_id,new.comment_id,new.return_post_id,new.observed_at,new.created_at)
  is distinct from row(old.user_id,old.account_id,old.actor_id,old.neighbor_id,old.own_post_id,old.comment_id,old.return_post_id,old.observed_at,old.created_at)
  or (new.expires_at is distinct from old.expires_at
   and not (new.expires_at='9999-12-31 00:00:00+00'::timestamptz and bnc_private.retention_exempt(new.user_id)))
  then raise exception 'BNC_SOURCE_CHANGED';end if;
 return new;
end $$;

create or replace function bnc_private.keep_exempt_expiry() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.expires_at>statement_timestamp()+interval '20 days' and new.expires_at<'9999-12-31 00:00:00+00'::timestamptz
  and bnc_private.retention_exempt(new.user_id) then
  new.expires_at:='9999-12-31 00:00:00+00'::timestamptz;
 end if;
 return new;
end $$;
revoke all on function bnc_private.keep_exempt_expiry() from public,anon,authenticated;

do $do$
declare
 t text; c record; inner_expr text;
 far constant timestamptz:='9999-12-31 00:00:00+00'::timestamptz;
 targets constant text[]:=array['bnc_jobs','bnc_reader_requests','bnc_reader_materials','bnc_analysis_sources','bnc_analysis_jobs','bnc_neighbor_imports','bnc_execution_evidence','bnc_engagement_inbox','bnc_extension_runs','bnc_extension_context_reads','bnc_return_visit_posts','bnc_message_jobs','bnc_accept_reads','bnc_incoming_requests','bnc_accept_jobs','bnc_post_targets','bnc_feed_checks','bnc_monitor_attempts'];
begin
 foreach t in array targets loop
  if (select count(*) from information_schema.columns where table_schema='public' and table_name=t
      and column_name in ('user_id','expires_at'))<>2 then
   raise exception 'BNC_RETENTION_TARGET_MISSING %',t;
  end if;
  -- 「생성 뒤 30일 이하」 같은 만료 제한은 그대로 두고 9999-12-31만 함께 허용한다.
  for c in select con.conname,pg_get_constraintdef(con.oid) def from pg_constraint con
   where con.conrelid=format('public.%I',t)::regclass and con.contype='c' and pg_get_constraintdef(con.oid) like '%expires_at%'
  loop
   inner_expr:=regexp_replace(c.def,'^CHECK \((.*)\)$','\1');
   if inner_expr=c.def then raise exception 'BNC_RETENTION_CHECK_SHAPE % %',t,c.conname; end if;
   execute format('alter table public.%I drop constraint %I, add constraint %I check ((%s) or expires_at=%L::timestamptz)',
    t,c.conname,c.conname,inner_expr,far);
  end loop;
  execute format('drop trigger if exists bnc_keep_exempt_expiry on public.%I',t);
  execute format('create trigger bnc_keep_exempt_expiry before insert or update of expires_at on public.%I for each row execute function bnc_private.keep_exempt_expiry()',t);
  -- 이미 있는 열외 회원 자료: 아직 지워지지 않았고 1일 넘게 남은 30일 보관 기한만 무기한으로.
  execute format('update public.%I x set expires_at=%L::timestamptz where x.expires_at>statement_timestamp()+interval ''1 day'' and x.expires_at<%L::timestamptz and bnc_private.retention_exempt(x.user_id)',
   t,far,far);
 end loop;
end $do$;

create or replace function public.bnc_monitor_dispatch(p_user_id uuid,p_operation text,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.bnc_monitors;a public.member_platform_accounts;x public.bnc_post_targets;p public.bnc_analysis_jobs;
 t timestamptz:=clock_timestamp();neighbor text;v jsonb;prepared jsonb;posts jsonb;amount bigint;n integer:=0;removed integer:=0;ai_target uuid;
begin
 if p_operation='cleanup' then
  if p_user_id is not null or p_payload is distinct from '{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  with doomed as(select id from public.bnc_monitor_attempts where expires_at<=t limit 1000) delete from public.bnc_monitor_attempts old using doomed where old.id=doomed.id;get diagnostics n=row_count;
  delete from public.bnc_monitors mo where mo.expires_at<=t-interval '30 days' and not bnc_private.retention_exempt(mo.user_id);get diagnostics removed=row_count;
  return jsonb_build_object('expiredMonitorRecordsRemoved',n+removed);
 end if;
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,71031));
 select * into m from public.bnc_monitors where user_id=p_user_id for update;
 -- A feed read has no paid or social side effect: an abandoned one only skips that neighbor until the next due time.
 if m.state='active' and m.work_kind='feed' and m.work_id is not null and m.lease_until<=t then
  update public.bnc_monitors set work_id=null,lease_until=null,last_kind='feed',feed_failures=feed_failures+1,last_reason='feed_failed' where user_id=p_user_id returning * into m;
 end if;
 if p_operation='status' then
  if p_payload<>'{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  if m.state='active' and (m.expires_at<=t or m.lease_until<=t) then update public.bnc_monitors set state='paused',last_reason=case when expires_at<=t then 'expired' else 'unconfirmed' end where user_id=p_user_id returning * into m;end if;
  return jsonb_build_object('monitor',case when m.user_id is null then null else to_jsonb(m) end,'awaitingBody',(select count(*) from public.bnc_post_targets where user_id=p_user_id and account_id=m.account_id and neighbor_id=any(m.neighbors) and not body_confirmed and expires_at>t));
 end if;
 if p_operation='start' then
  if p_payload->'confirmed' is distinct from 'true'::jsonb or p_payload->'feedConsent' is distinct from 'true'::jsonb or coalesce(m.revision,0) is distinct from (p_payload->>'expectedRevision')::bigint or m.state in ('active','paused') then raise exception 'BNC_MONITOR_CHANGED';end if;
  select * into a from public.member_platform_accounts where id=(p_payload->>'accountId')::uuid and user_id=p_user_id and platform='naver_blog' and not needs_reconnect;
  if not found then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
  if jsonb_array_length(p_payload->'neighbors') not between 1 and 50 or (select count(distinct value) from jsonb_array_elements_text(p_payload->'neighbors'))<>jsonb_array_length(p_payload->'neighbors') then raise exception 'BNC_INVALID_INPUT';end if;
  for neighbor in select jsonb_array_elements_text(p_payload->'neighbors') loop
   if not exists(select 1 from public.bnc_neighbor_directory where user_id=p_user_id and account_id=a.id and neighbor_id=neighbor and new_posts_enabled) then raise exception 'BNC_TARGET_DISABLED';end if;
  end loop;
  if p_payload->'aiEnabled'='true'::jsonb then
   if p_payload->'aiConsent' is distinct from 'true'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
   select * into p from public.bnc_analysis_jobs where id=(p_payload->>'profileId')::uuid and user_id=p_user_id and kind='profile' and state='succeeded' and reviewed_result is not null and revision=(p_payload->>'profileRevision')::integer and input->>'ownBlogId'=a.external_id and expires_at>t+interval '90 seconds';
   if not found or nullif(p_payload->>'quoteHash','') is null then raise exception 'BNC_MESSAGE_PROFILE';end if;
  end if;
  insert into public.bnc_monitors(user_id,state,account_id,neighbors,background,runner,ai_enabled,profile_id,profile_revision,provider,model,quote_hash,budget_micros,max_ai,created_at,expires_at)
   values(p_user_id,'active',a.id,array(select jsonb_array_elements_text(p_payload->'neighbors')),p_payload->'background'='true'::jsonb,coalesce(p_payload->>'runner','server'),(p_payload->>'aiEnabled')::boolean,p.id,p.revision,p_payload->>'provider',p_payload->>'model',p_payload->>'quoteHash',(p_payload->>'budgetMicros')::bigint,(p_payload->>'maxAi')::integer,t,least(t+interval '7 days',coalesce(p.expires_at,t+interval '7 days')))
   on conflict(user_id) do update set id=gen_random_uuid(),revision=public.bnc_monitors.revision+1,state='active',account_id=excluded.account_id,neighbors=excluded.neighbors,background=excluded.background,runner=excluded.runner,runner_seen_at=null,feed_failures=0,last_feed_at=null,ai_enabled=excluded.ai_enabled,profile_id=excluded.profile_id,profile_revision=excluded.profile_revision,provider=excluded.provider,model=excluded.model,quote_hash=excluded.quote_hash,budget_micros=excluded.budget_micros,max_ai=excluded.max_ai,reserved_micros=0,ai_count=0,feed_count=0,generation=public.bnc_monitors.generation+1,work_id=null,work_kind=null,lease_until=null,last_kind=null,last_reason='started',created_at=t,expires_at=excluded.expires_at returning * into m;
  return jsonb_build_object('saved',true,'sessionId',m.id,'externalActions',0);
 end if;
 -- The extension reads RSS on the member's PC and checks in here about hourly: this is the only regular server call of an extension session.
 if p_operation='extension_sync' then
  if m.user_id is null or m.state<>'active' or m.runner<>'extension' then return jsonb_build_object('active',false);end if;
  if m.expires_at<=t then update public.bnc_monitors set state='paused',last_reason='expired' where user_id=p_user_id;return jsonb_build_object('active',false);end if;
  if not exists(select 1 from public.member_platform_accounts where id=m.account_id and user_id=p_user_id and platform='naver_blog' and not needs_reconnect) then return jsonb_build_object('active',false);end if;
  update public.bnc_monitors set runner_seen_at=t,feed_count=feed_count+(p_payload->>'reads')::integer,feed_failures=(p_payload->>'failures')::integer,last_feed_at=case when p_payload->>'lastReadAt' is null then last_feed_at else greatest(last_feed_at,least((p_payload->>'lastReadAt')::timestamptz,t)) end where user_id=p_user_id returning * into m;
  return jsonb_build_object('active',true,'sessionId',m.id,'expiresAt',m.expires_at,'neighbors',coalesce((select jsonb_agg(z order by z) from unnest(m.neighbors)z where exists(select 1 from public.bnc_neighbor_directory where user_id=p_user_id and account_id=m.account_id and neighbor_id=z and new_posts_enabled)),'[]'::jsonb));
 end if;
 if m.user_id is null or m.id is distinct from (p_payload->>'sessionId')::uuid then raise exception 'BNC_MONITOR_CHANGED';end if;
 if p_operation='extension_report' then
  if m.state<>'active' or m.runner<>'extension' or m.expires_at<=t or not((p_payload->>'neighborId')=any(m.neighbors)) then raise exception 'BNC_MONITOR_CHANGED';end if;
  -- An article whose stored copy already expired stays out, so one old RSS entry cannot block the neighbor's new posts on every check.
  select coalesce(jsonb_agg(e),'[]'::jsonb) into posts from jsonb_array_elements(p_payload->'posts') e where not exists(select 1 from public.bnc_post_targets where user_id=p_user_id and neighbor_id=e->>'blogId' and post_id=e->>'postId' and expires_at<=t) and not exists(select 1 from public.bnc_analysis_sources where user_id=p_user_id and blog_id=e->>'blogId' and post_id=e->>'postId' and expires_at<=t);
  v:=public.bnc_post_dispatch(p_user_id,null,'import',jsonb_build_object('accountId',m.account_id,'neighborId',p_payload->>'neighborId','rightsConfirmed',true,'bodyConfirmed',false,'posts',posts));
  update public.bnc_monitors set runner_seen_at=t,last_feed_at=t,feed_failures=0,last_kind='feed',last_reason='completed' where user_id=p_user_id;
  return v||jsonb_build_object('completed',true);
 end if;
 if p_operation='stop' then
  update public.bnc_monitors set state=case when work_id is null or work_kind='feed' then 'off' else 'paused' end,work_id=case when work_kind='feed' then null else work_id end,lease_until=case when work_kind='feed' then null else lease_until end,revision=revision+1,last_reason='stopped' where user_id=p_user_id;return jsonb_build_object('stopped',true);
 end if;
 if p_operation='acknowledge' then
  if p_payload->'confirmed' is distinct from 'true'::jsonb or m.state<>'paused' or m.lease_until>t then raise exception 'BNC_MONITOR_BUSY';end if;
  update public.bnc_monitor_attempts set state='uncertain' where user_id=p_user_id and session_id=m.id and state in ('prepared','running');
  update public.bnc_monitors set state='off',revision=revision+1,generation=generation+1,work_id=null,lease_until=null,last_reason='acknowledged' where user_id=p_user_id;
  return jsonb_build_object('acknowledged',true,'externalActions',0);
 end if;
 if p_operation='claim' then
  if m.state<>'active' then return jsonb_build_object('phase','idle','reason',m.state);end if;
  if m.expires_at<=t or m.lease_until<=t then update public.bnc_monitors set state='paused',last_reason=case when expires_at<=t then 'expired' else 'unconfirmed' end where user_id=p_user_id;return jsonb_build_object('phase','idle','reason','paused');end if;
  if m.work_id is not null then return jsonb_build_object('phase','idle','reason','busy');end if;
  if not exists(select 1 from public.member_platform_accounts where id=m.account_id and user_id=p_user_id and platform='naver_blog' and not needs_reconnect) then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
  if m.ai_enabled and p_payload->'feedOnly' is distinct from 'true'::jsonb then
   select cand.id into ai_target from public.bnc_post_targets cand where cand.user_id=p_user_id and cand.account_id=m.account_id and cand.neighbor_id=any(m.neighbors) and cand.body_confirmed and cand.expires_at>t+interval '90 seconds'
    and exists(select 1 from public.bnc_neighbor_directory where user_id=p_user_id and account_id=m.account_id and neighbor_id=cand.neighbor_id and new_posts_enabled)
    and not exists(select 1 from public.bnc_message_jobs where user_id=p_user_id and neighbor_id=cand.neighbor_id and post_id=cand.post_id and state in ('queued','running','succeeded','uncertain'))
    and not exists(select 1 from public.bnc_monitor_attempts where user_id=p_user_id and neighbor_id=cand.neighbor_id and post_id=cand.post_id) order by cand.created_at,cand.id limit 1;
  end if;
  if m.feed_count<40000 and m.runner='server' then
   select z into neighbor from unnest(m.neighbors)z where exists(select 1 from public.bnc_neighbor_directory where user_id=p_user_id and account_id=m.account_id and neighbor_id=z and new_posts_enabled)
    and not exists(select 1 from public.bnc_feed_checks where user_id=p_user_id and neighbor_id=z and checked_at>t-interval '15 minutes' and expires_at>t) order by z limit 1;
  end if;
  if ai_target is not null and m.ai_count<m.max_ai and (neighbor is null or m.last_kind='feed') then
   select * into x from public.bnc_post_targets where id=ai_target;
   insert into public.bnc_monitor_attempts(id,user_id,session_id,target_id,neighbor_id,post_id,state,expires_at) values(gen_random_uuid(),p_user_id,m.id,x.id,x.neighbor_id,x.post_id,'prepared',x.expires_at) returning id into m.work_id;
   update public.bnc_monitors set work_id=m.work_id,work_kind='ai',target_id=x.id,neighbor_id=x.neighbor_id,generation=generation+1,lease_until=t+interval '2 minutes',last_reason='preparing_ai' where user_id=p_user_id returning * into m;
  elsif neighbor is not null then
   perform public.bnc_post_dispatch(p_user_id,null,'reserve_feed',jsonb_build_object('accountId',m.account_id,'neighborId',neighbor));
   update public.bnc_monitors set work_id=gen_random_uuid(),work_kind='feed',neighbor_id=neighbor,target_id=null,feed_count=feed_count+1,generation=generation+1,lease_until=t+interval '2 minutes',last_reason='reading_feed' where user_id=p_user_id returning * into m;
  else return jsonb_build_object('phase','idle','reason','waiting','nextDueAt',t+interval '15 minutes');end if;
  return to_jsonb(m)||jsonb_build_object('phase',m.work_kind);
 end if;
 if m.work_id is distinct from (p_payload->>'workId')::uuid or m.generation is distinct from (p_payload->>'generation')::bigint then raise exception 'BNC_STALE_RUN';end if;
 if p_operation='fail' then
  if m.work_kind='feed' then update public.bnc_monitors set work_id=null,lease_until=null,last_kind='feed',feed_failures=feed_failures+1,last_reason='feed_failed' where user_id=p_user_id;return jsonb_build_object('paused',false);end if;
  update public.bnc_monitor_attempts set state=case when state='prepared' then 'blocked' else 'uncertain' end where id=m.work_id and user_id=p_user_id and state in ('prepared','running');
  update public.bnc_monitors set state='paused',last_reason='unconfirmed' where user_id=p_user_id;return jsonb_build_object('paused',true);
 end if;
 if m.state<>'active' or m.expires_at<=t or m.lease_until<=t or not exists(select 1 from public.member_platform_accounts where id=m.account_id and user_id=p_user_id and not needs_reconnect) or not exists(select 1 from public.bnc_neighbor_directory where user_id=p_user_id and account_id=m.account_id and neighbor_id=m.neighbor_id and new_posts_enabled) then raise exception 'BNC_MONITOR_CHANGED';end if;
 if p_operation='check' then return jsonb_build_object('allowed',true);end if;
 if p_operation='feed_complete' and m.work_kind='feed' then
  v:=public.bnc_post_dispatch(p_user_id,null,'import',jsonb_build_object('accountId',m.account_id,'neighborId',m.neighbor_id,'rightsConfirmed',true,'bodyConfirmed',false,'posts',p_payload->'posts'));
  update public.bnc_monitors set feed_failures=0,last_feed_at=t where user_id=p_user_id;
 elsif p_operation='reserve_ai' and m.work_kind='ai' then
  select * into x from public.bnc_post_targets where id=m.target_id and user_id=p_user_id and body_confirmed and expires_at>t+interval '90 seconds';prepared:=p_payload->'prepared';amount:=(p_payload->>'amountMicros')::bigint;
  if not found or prepared->>'id' is distinct from m.work_id::text or prepared->>'kind' is distinct from 'comment' or prepared->'input'->>'accountId' is distinct from m.account_id::text or prepared->'input'->>'profileId' is distinct from m.profile_id::text or prepared->'input'->>'profileRevision' is distinct from m.profile_revision::text or prepared->'input'->>'provider' is distinct from m.provider or prepared->'input'->>'model' is distinct from m.model or prepared->'input'->'post'->>'hash' is distinct from x.content_hash or p_payload->>'quoteHash' is distinct from m.quote_hash or amount is null or amount<=0 then raise exception 'BNC_MONITOR_CHANGED';end if;
  if m.ai_count>=m.max_ai or m.reserved_micros+amount>m.budget_micros then update public.bnc_monitor_attempts set state='blocked' where id=m.work_id;update public.bnc_monitors set state=case when background then 'active' else 'paused' end,ai_enabled=case when background then false else ai_enabled end,last_reason='budget',work_id=null,lease_until=null where user_id=p_user_id;return jsonb_build_object('phase','budget');end if;
  if not exists(select 1 from public.bnc_monitor_attempts where id=m.work_id and user_id=p_user_id and state='prepared') then raise exception 'BNC_STALE_RUN';end if;
  perform public.bnc_message_dispatch(p_user_id,'prepare',prepared);
  v:=public.bnc_message_dispatch(p_user_id,'claim',jsonb_build_object('id',m.work_id,'run_hash',p_payload->>'runHash'));
  update public.bnc_monitors set reserved_micros=reserved_micros+amount,ai_count=ai_count+1 where user_id=p_user_id;
  update public.bnc_monitor_attempts set state='running',reserved_micros=amount where id=m.work_id;return v||jsonb_build_object('phase','ai');
 elsif p_operation='ai_complete' and m.work_kind='ai' then
  if not exists(select 1 from public.bnc_message_jobs where id=m.work_id and user_id=p_user_id and state='succeeded') then raise exception 'BNC_STALE_RUN';end if;
  update public.bnc_monitor_attempts set state='succeeded' where id=m.work_id and user_id=p_user_id;v:=jsonb_build_object('messageId',m.work_id);
 else raise exception 'BNC_INVALID_INPUT';end if;
 update public.bnc_monitors set work_id=null,lease_until=null,last_kind=work_kind,last_reason='completed' where user_id=p_user_id;
 return v||jsonb_build_object('completed',true,'externalActions',0);
end $$;
revoke all on function public.bnc_monitor_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_monitor_dispatch(uuid,text,jsonb) to service_role;
commit;
