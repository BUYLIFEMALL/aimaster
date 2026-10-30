-- User-provided/publisher-feed material planning; no AI or social actions.
begin;
set local lock_timeout='5s';set local statement_timeout='30s';
create table public.bnc_post_targets(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.bnc_settings(user_id) on delete cascade,
 account_id uuid not null references public.member_platform_accounts(id) on delete cascade,neighbor_id text not null,post_id text not null check(post_id~'^[0-9]{1,30}$'),
 title text not null check(length(title) between 1 and 500),body text not null default '' check(length(body)<=20000),body_confirmed boolean not null default false,
 content_hash text not null check(content_hash~'^[a-f0-9]{64}$'),published_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null,
 unique(user_id,account_id,neighbor_id,post_id),check(expires_at=created_at+interval '720 hours'),check(not body_confirmed or length(body)>=30)
);
alter table public.bnc_post_targets enable row level security;
revoke all on public.bnc_post_targets from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.bnc_post_targets to service_role;
create table public.bnc_feed_checks(user_id uuid not null references public.bnc_settings(user_id) on delete cascade,neighbor_id text not null,checked_at timestamptz not null default clock_timestamp(),created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default(clock_timestamp()+interval '720 hours'),primary key(user_id,neighbor_id));
alter table public.bnc_feed_checks enable row level security;revoke all on public.bnc_feed_checks from public,anon,authenticated,service_role;grant select,insert,update,delete on public.bnc_feed_checks to service_role;
create index bnc_post_targets_owner on public.bnc_post_targets(user_id,expires_at);
alter table public.bnc_extension_runs add column directory_required boolean not null default false;
create function public.bnc_post_dispatch(p_user_id uuid,p_device_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bnc_settings;a public.member_platform_accounts;d public.bnc_reader_devices;p public.bnc_schedule_preferences;c public.bnc_schedule_cursor;j public.bnc_jobs;
 x public.bnc_post_targets;t timestamptz:=clock_timestamp();v jsonb;z jsonb;source_created timestamptz;source_expiry timestamptz;n integer:=0;m integer;
begin
 if p_operation='cleanup' then
  if p_user_id is not null or p_device_id is not null or p_payload is distinct from '{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  with doomed as(select id from public.bnc_post_targets where expires_at<=t order by expires_at,id limit 1000) delete from public.bnc_post_targets gone using doomed doomed_row where gone.id=doomed_row.id;get diagnostics n=row_count;delete from public.bnc_feed_checks where expires_at<=t;get diagnostics m=row_count;return jsonb_build_object('expiredPostTargetsRemoved',n+m);
 end if;
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 insert into public.bnc_settings(user_id) values(p_user_id) on conflict do nothing;select * into s from public.bnc_settings where user_id=p_user_id for update;
 if p_operation='approve' then
  select * into j from public.bnc_jobs where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>t for update;
  if not found or j.state not in ('draft','ready') or j.body is distinct from p_payload->>'expected_body' then raise exception 'BNC_TARGET_CHANGED';end if;return public.bnc_dispatch(p_user_id,'approve',jsonb_build_object('id',j.id));
 end if;
 if p_operation='configure' then
  if p_payload->'confirmed' is distinct from 'true'::jsonb or s.revision is distinct from (p_payload->>'expected_revision')::bigint then raise exception 'BNC_STALE_REVISION';end if;
  if p_payload->'enabled'='true'::jsonb and exists(select 1 from public.bnc_accept_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')) then raise exception 'BNC_UNCERTAIN';end if;
  return public.bnc_dispatch(p_user_id,'configure',p_payload-'expected_revision'-'confirmed');
 end if;
 if p_operation='directory' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select b.account_id,acc.external_id,b.neighbor_id from public.bnc_neighbor_directory b join public.member_platform_accounts acc on acc.id=b.account_id and acc.user_id=p_user_id and not acc.needs_reconnect where b.user_id=p_user_id and b.new_posts_enabled order by b.account_id,b.neighbor_id limit 200)q);end if;
 if p_operation='list' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select id,account_id,neighbor_id,post_id,title,published_at,body_confirmed,expires_at from public.bnc_post_targets where user_id=p_user_id and expires_at>t order by created_at desc,id limit 50)q);end if;
 if p_operation='offer' then
  if p_payload->>'target_kind' is distinct from 'post' then raise exception 'BNC_INVALID_INPUT';end if;
  v:=public.bnc_extension_execute(p_user_id,p_device_id,'scheduled_offer',p_payload);if v->>'phase'='inspect' then update public.bnc_extension_runs set directory_required=true where id=(v->>'id')::uuid and user_id=p_user_id and device_id=p_device_id;end if;return v;
 end if;
 if p_operation='next' then
  select * into d from public.bnc_reader_devices where id=p_device_id and user_id=p_user_id and revoked_at is null and expires_at>t;
  if not found or not exists(select 1 from public.member_platform_accounts where id=d.account_id and user_id=p_user_id and external_id=d.blog_id and platform='naver_blog' and not needs_reconnect) then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
  if not exists(select 1 from public.bnc_extension_permissions where device_id=d.id and user_id=p_user_id and revoked_at is null and expires_at>t and kinds&&array(select jsonb_array_elements_text(p_payload->'kinds'))) then raise exception 'BNC_EXTENSION_NOT_READY';end if;
  if not s.enabled or not exists(select 1 from public.bnc_runtime where singleton and live_allowed and nullif(btrim(policy_reference),'') is not null) then return jsonb_build_object('phase','blocked','reason','disabled');end if;

  perform public.bnc_schedule_preferences_dispatch(p_user_id,'get','{}');select * into p from public.bnc_schedule_preferences where user_id=p_user_id for update;select * into c from public.bnc_schedule_cursor where user_id=p_user_id for update;
  if c.state='paused' then return jsonb_build_object('phase','blocked','reason','result_check_required');end if;
  if c.state='running' then z:=public.bnc_schedule_tick(p_user_id,'begin',jsonb_build_object('job_id',c.job_id,'device_id',d.id,'preference_revision',p.revision,'settings_revision',s.revision));return jsonb_build_object('phase',case when z->>'reason'='result_check_required' then 'blocked' else 'waiting' end,'reason',z->>'reason');end if;
  if exists(select 1 from public.bnc_accept_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')) or exists(select 1 from public.bnc_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')) then return jsonb_build_object('phase','blocked','reason','result_check_required');end if;
  select w.* into j from public.bnc_jobs w where w.user_id=p_user_id and w.account_id=d.account_id and w.actor_id=d.blog_id and w.state='ready' and w.approval_revision=s.revision and w.approval_hash is not null and w.expires_at>t and w.kind in ('like','comment','reply')
   and exists(select 1 from public.bnc_neighbor_directory directory where directory.user_id=p_user_id and directory.account_id=w.account_id and directory.neighbor_id=w.neighbor_id and (case when w.kind='reply' then directory.return_visits_enabled else directory.new_posts_enabled end))
   and w.kind in(select jsonb_array_elements_text(p_payload->'kinds')) and exists(select 1 from public.bnc_extension_permissions e where e.device_id=d.id and e.user_id=p_user_id and e.revoked_at is null and e.expires_at>t and w.kind=any(e.kinds)) order by w.created_at,w.id limit 1;
  if not found then return jsonb_build_object('phase','idle','reason','no_approved_work','nextDueAt',c.next_due_at);end if;
  if c.user_id is null or c.preference_revision<>p.revision or c.state='running' then z:=public.bnc_schedule_tick(p_user_id,'begin',jsonb_build_object('job_id',j.id,'device_id',d.id,'preference_revision',p.revision,'settings_revision',s.revision));return jsonb_build_object('phase','waiting','reason',z->>'reason','nextDueAt',z->'next_due_at');end if;
  if c.next_due_at>t then return jsonb_build_object('phase','waiting','reason','not_due','nextDueAt',c.next_due_at);end if;
  m:=extract(hour from(t at time zone 'Asia/Seoul'))::integer*60+extract(minute from(t at time zone 'Asia/Seoul'))::integer;
  if not(p.start_minute=p.end_minute or(p.start_minute<p.end_minute and m>=p.start_minute and m<p.end_minute) or(p.start_minute>p.end_minute and(m>=p.start_minute or m<p.end_minute))) then return jsonb_build_object('phase','waiting','reason','outside_window','nextDueAt',bnc_private.schedule_next(t,p.interval_minutes,p.start_minute,p.end_minute));end if;
  return jsonb_build_object('phase','navigate','jobId',j.id,'kind',j.kind,'actorId',j.actor_id,'url','https://blog.naver.com/'||(case when j.kind='reply' then j.actor_id else j.neighbor_id end)||'/'||j.post_id);
 end if;
 if p_operation in ('source','import','reserve_feed') then
  select * into a from public.member_platform_accounts where id=(p_payload->>'accountId')::uuid and user_id=p_user_id and platform='naver_blog' and not needs_reconnect;
  if not found or not exists(select 1 from public.bnc_neighbor_directory where user_id=p_user_id and account_id=a.id and neighbor_id=p_payload->>'neighborId' and new_posts_enabled) then raise exception 'BNC_TARGET_DISABLED';end if;
  if p_operation='reserve_feed' then
   delete from public.bnc_feed_checks where user_id=p_user_id and neighbor_id=p_payload->>'neighborId' and expires_at<=t;
   if exists(select 1 from public.bnc_feed_checks where user_id=p_user_id and neighbor_id=p_payload->>'neighborId' and checked_at>t-interval '15 minutes') then raise exception 'BNC_FEED_WAIT';end if;
   insert into public.bnc_feed_checks(user_id,neighbor_id) values(p_user_id,p_payload->>'neighborId') on conflict(user_id,neighbor_id) do update set checked_at=excluded.checked_at;return jsonb_build_object('allowed',true);
  end if;
  if p_operation='source' then return jsonb_build_object('allowed',true);end if;
  if p_payload->'rightsConfirmed' is distinct from 'true'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  for v in select * from jsonb_array_elements(p_payload->'posts') loop
   if v->>'blogId' is distinct from p_payload->>'neighborId' then raise exception 'BNC_TARGET_CHANGED';end if;
   select min(created_at),min(expires_at) into source_created,source_expiry from (select created_at,expires_at from public.bnc_analysis_sources where user_id=p_user_id and blog_id=v->>'blogId' and post_id=v->>'postId' union all select created_at,expires_at from public.bnc_post_targets where user_id=p_user_id and neighbor_id=v->>'blogId' and post_id=v->>'postId') origin;
   if source_expiry<=t then raise exception 'BNC_SOURCE_EXPIRED';end if;
   insert into public.bnc_post_targets(user_id,account_id,neighbor_id,post_id,title,body,body_confirmed,content_hash,published_at,created_at,expires_at)
    values(p_user_id,a.id,v->>'blogId',v->>'postId',v->>'title',case when p_payload->'bodyConfirmed'='true'::jsonb then v->>'body' else '' end,p_payload->'bodyConfirmed'='true'::jsonb,v->>'hash',(v->>'publishedAt')::timestamptz,coalesce(source_created,t),coalesce(source_expiry,t+interval '720 hours')) on conflict(user_id,account_id,neighbor_id,post_id) do nothing;
   if found then n:=n+1;end if;
   select * into x from public.bnc_post_targets where user_id=p_user_id and account_id=a.id and neighbor_id=v->>'blogId' and post_id=v->>'postId';
   if x.body_confirmed then insert into public.bnc_analysis_sources(user_id,blog_id,post_id,title,body,content_hash,created_at,expires_at) values(p_user_id,x.neighbor_id,x.post_id,x.title,x.body,x.content_hash,x.created_at,x.expires_at) on conflict(user_id,blog_id,post_id,content_hash) do nothing;end if;
  end loop;return jsonb_build_object('savedCount',n,'externalActions',0);
 end if;
 if p_operation='provide' then
  select * into x from public.bnc_post_targets where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>t for update;
  if not found or p_payload->'confirmed' is distinct from 'true'::jsonb or p_payload->'rightsConfirmed' is distinct from 'true'::jsonb or (x.body_confirmed and x.content_hash is distinct from p_payload->>'hash') then raise exception 'BNC_TARGET_CHANGED';end if;
  update public.bnc_post_targets set body=p_payload->>'body',body_confirmed=true,content_hash=p_payload->>'hash' where id=x.id;
  insert into public.bnc_analysis_sources(user_id,blog_id,post_id,title,body,content_hash,created_at,expires_at) values(p_user_id,x.neighbor_id,x.post_id,x.title,p_payload->>'body',p_payload->>'hash',x.created_at,x.expires_at) on conflict(user_id,blog_id,post_id,content_hash) do nothing;return jsonb_build_object('saved',true,'externalActions',0);
 end if;
 if p_operation='get' then return (select jsonb_build_object('id',id,'title',title) from public.bnc_post_targets where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>t);end if;
 if p_operation='material' then
  select * into x from public.bnc_post_targets where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>t;
  if not found or not x.body_confirmed or not exists(select 1 from public.member_platform_accounts where id=x.account_id and user_id=p_user_id and not needs_reconnect) or not exists(select 1 from public.bnc_neighbor_directory where user_id=p_user_id and account_id=x.account_id and neighbor_id=x.neighbor_id and new_posts_enabled) then raise exception 'BNC_TARGET_DISABLED';end if;
  return jsonb_build_object('id',x.id,'accountId',x.account_id,'url','https://blog.naver.com/'||x.neighbor_id||'/'||x.post_id,'title',x.title,'body',x.body,'expiresAt',x.expires_at);
 end if;
 raise exception 'BNC_INVALID_INPUT';
end $$;
revoke all on function public.bnc_post_dispatch(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_post_dispatch(uuid,uuid,text,jsonb) to service_role;
create function public.bnc_post_cleanup(p_user_id uuid,p_operation text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select public.bnc_post_dispatch(p_user_id,null,p_operation,p_payload);$$;
revoke all on function public.bnc_post_cleanup(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_post_cleanup(uuid,text,jsonb) to service_role;

create function bnc_private.guard_post_directory() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if exists(select 1 from public.bnc_extension_runs where user_id=new.user_id and job_id=new.id and phase<>'done' and directory_required) and not exists(select 1 from public.bnc_neighbor_directory where user_id=new.user_id and account_id=new.account_id and neighbor_id=new.neighbor_id and (case when new.kind='reply' then return_visits_enabled else new_posts_enabled end)) then raise exception 'BNC_TARGET_DISABLED';end if;
 return new;
end $$;
revoke all on function bnc_private.guard_post_directory() from public,anon,authenticated;grant execute on function bnc_private.guard_post_directory() to service_role;
create trigger bnc_post_directory_guard before update of state on public.bnc_jobs for each row when(new.state in ('claimed','armed')) execute function bnc_private.guard_post_directory();
commit;
