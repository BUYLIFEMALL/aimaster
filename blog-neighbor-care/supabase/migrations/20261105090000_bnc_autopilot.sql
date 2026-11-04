-- v1.18 단계 C-2: 완전 자동 운영(주인님 승인 PLAN_20261105_STAGE_C2.md, 2026-11-05 「진행해」).
-- 새 표 1개(bnc_autopilot)와 새 함수 2개만 추가한다. 기존 표·함수·자료는 바꾸지 않는다.
-- 자동 운영의 전제(자동화 지침): 회원 본인 계정·키, 처음 한 번 통합 동의, 상한·시간대 안, 결과 불확실 시 재실행 금지,
-- 전체 일시정지 하나, 모든 자동 동작은 기존 작업 기록(bnc_jobs)에 남는다.
-- 자동 승인 범위(주인님 결정 2026-11-04): 공감은 AI 없이 새 글마다 자동, 댓글은 감시 AI가 만들고 품질 검사를 통과한 초안만 자동(하루 상한 기본 3).
-- 설정 자료이므로 30일 정리 대상이 아니다(회원 삭제 시 함께 지워짐).
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

create table public.bnc_autopilot(
 user_id uuid primary key references public.bnc_settings(user_id) on delete cascade,
 tasks text[] not null default array['like','comment']::text[] check(tasks <@ array['like','comment']::text[]),
 consented_at timestamptz,
 consent_version integer not null default 0 check(consent_version between 0 and 100),
 paused boolean not null default false,
 paused_at timestamptz,
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.bnc_autopilot enable row level security;
revoke all on public.bnc_autopilot from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.bnc_autopilot to service_role;

-- 화면 요약·시작하기 저장·일시정지. 실행(누르기)은 여기서 하지 않는다.
create function public.bnc_autopilot_dispatch(p_user_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bnc_settings;a public.bnc_autopilot;pref jsonb;c public.bnc_schedule_cursor;t timestamptz:=clock_timestamp();
 v_day date;v_tasks text[];v_kinds text[];
begin
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 insert into public.bnc_settings(user_id) values(p_user_id) on conflict do nothing;
 select * into s from public.bnc_settings where user_id=p_user_id for update;
 v_day:=(t at time zone 'Asia/Seoul')::date;
 if p_operation='save' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('mode','tasks','like_cap','comment_cap','interval_minutes','start_minute','end_minute','expected_revision','device_id','confirmed'))
   or p_payload->'confirmed' is distinct from 'true'::jsonb or p_payload->>'mode' not in ('auto','review') or jsonb_typeof(p_payload->'tasks') is distinct from 'array'
   or jsonb_array_length(p_payload->'tasks') not between 1 and 2 or s.revision is distinct from (p_payload->>'expected_revision')::bigint then raise exception 'BNC_STALE_REVISION';end if;
  v_tasks:=array(select distinct jsonb_array_elements_text(p_payload->'tasks') order by 1);
  if not v_tasks <@ array['like','comment']::text[] then raise exception 'BNC_INVALID_INPUT';end if;
  -- 실행 허용·상한·모드를 한 번에(기존 configure 그대로 — 실행 중 불확실 작업이 있으면 거기서 막힌다).
  perform public.bnc_dispatch(p_user_id,'configure',jsonb_build_object('enabled',true,'mode',p_payload->>'mode',
   'like_cap',(p_payload->>'like_cap')::integer,'comment_cap',(p_payload->>'comment_cap')::integer));
  -- 동작 시간대(기존 함수, 현재 리비전으로 저장).
  pref:=public.bnc_schedule_preferences_dispatch(p_user_id,'get','{}');
  perform public.bnc_schedule_preferences_dispatch(p_user_id,'save',jsonb_build_object('interval_minutes',(p_payload->>'interval_minutes')::integer,
   'start_minute',(p_payload->>'start_minute')::integer,'end_minute',(p_payload->>'end_minute')::integer,'expected_revision',(pref->>'revision')::bigint));
  -- 이 기기 확장이 고른 동작만 실행하도록 허용(기존 함수). 대댓글은 댓글과 같은 동의 범위로 둔다.
  v_kinds:=v_tasks||(case when 'comment'=any(v_tasks) then array['reply'] else array[]::text[] end);
  perform public.bnc_extension_permission_dispatch(p_user_id,'grant',jsonb_build_object('device_id',p_payload->>'device_id','confirmed',true,'kinds',to_jsonb(v_kinds)));
  insert into public.bnc_autopilot(user_id,tasks,consented_at,consent_version,paused,paused_at)
   values(p_user_id,v_tasks,t,1,false,null)
   on conflict(user_id) do update set tasks=excluded.tasks,consented_at=excluded.consented_at,consent_version=1,paused=false,paused_at=null,revision=public.bnc_autopilot.revision+1,updated_at=t;
  select * into s from public.bnc_settings where user_id=p_user_id;
 elsif p_operation in ('pause','resume') then
  if p_payload<>'{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  insert into public.bnc_autopilot(user_id) values(p_user_id) on conflict do nothing;
  update public.bnc_autopilot set paused=(p_operation='pause'),paused_at=case when p_operation='pause' then t end,revision=revision+1,updated_at=t where user_id=p_user_id;
 elsif p_operation='revoke' then
  if p_payload<>'{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  update public.bnc_autopilot set consented_at=null,consent_version=0,revision=revision+1,updated_at=t where user_id=p_user_id;
 elsif p_operation<>'get' or p_payload<>'{}'::jsonb then raise exception 'BNC_INVALID_INPUT';
 end if;
 select * into a from public.bnc_autopilot where user_id=p_user_id;
 pref:=public.bnc_schedule_preferences_dispatch(p_user_id,'get','{}');
 select * into c from public.bnc_schedule_cursor where user_id=p_user_id;
 return jsonb_build_object(
  'consented',a.consented_at is not null,'consentedAt',a.consented_at,'paused',coalesce(a.paused,false),'tasks',coalesce(to_jsonb(a.tasks),'["like","comment"]'::jsonb),
  'mode',s.mode,'enabled',s.enabled,'likeCap',s.like_cap,'commentCap',s.comment_cap,'revision',s.revision,
  'liveAllowed',coalesce((select live_allowed from public.bnc_runtime where singleton),false),
  'schedule',jsonb_build_object('intervalMinutes',pref->'interval_minutes','startMinute',pref->'start_minute','endMinute',pref->'end_minute'),
  'nextDueAt',c.next_due_at,
  'today',jsonb_build_object(
   'like',coalesce((select succeeded from public.bnc_daily where user_id=p_user_id and day=v_day and kind='like'),0),
   'comment',coalesce((select succeeded from public.bnc_daily where user_id=p_user_id and day=v_day and kind='comment'),0),
   'request',coalesce((select succeeded from public.bnc_daily where user_id=p_user_id and day=v_day and kind='request'),0)),
  'waiting',(select count(*) from public.bnc_jobs where user_id=p_user_id and state='ready' and expires_at>t),
  'attention',jsonb_build_object(
   'uncertainJobs',(select count(*) from public.bnc_jobs where user_id=p_user_id and state in ('uncertain') and expires_at>t),
   'resultCheck',coalesce(c.state='paused',false),
   'messageUncertain',(select count(*) from public.bnc_message_jobs where user_id=p_user_id and state='uncertain' and expires_at>t),
   'notEnabled',not s.enabled));
end $$;
revoke all on function public.bnc_autopilot_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_autopilot_dispatch(uuid,text,jsonb) to service_role;

-- 확장이 다음 대상을 묻기 직전에 부른다: 일시정지면 멈추고, 자동 모드면 새 글 공감·통과한 댓글 초안을 작업으로 만들어 승인한다.
-- 한 번에 최대 10건, 하루 상한(오늘 만든 작업 수 기준) 안에서만. 실패한 줄은 건너뛰고 다른 줄은 계속한다(실행은 여기서 하지 않음).
create function public.bnc_autopilot_prepare(p_user_id uuid,p_device_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bnc_settings;a public.bnc_autopilot;d public.bnc_reader_devices;t timestamptz:=clock_timestamp();v_start timestamptz;
 v_left integer;n_like integer:=0;n_comment integer:=0;n_refresh integer:=0;r record;v jsonb;
begin
 if p_user_id is null then raise exception 'BNC_INVALID_INPUT';end if;
 select * into a from public.bnc_autopilot where user_id=p_user_id;
 if found and a.paused then return jsonb_build_object('paused',true,'prepared',0);end if;
 select * into s from public.bnc_settings where user_id=p_user_id;
 if not found or a.user_id is null or a.consented_at is null or s.mode<>'auto' or not s.enabled then return jsonb_build_object('paused',false,'prepared',0,'auto',false);end if;
 select * into d from public.bnc_reader_devices where id=p_device_id and user_id=p_user_id and revoked_at is null and expires_at>t;
 if not found then return jsonb_build_object('paused',false,'prepared',0,'auto',false);end if;
 v_start:=((t at time zone 'Asia/Seoul')::date)::timestamp at time zone 'Asia/Seoul';
 -- 설정을 바꾸면 리비전이 올라가 이전 승인이 멈춘다. 자동 모드에서 본문이 그대로인 자동 대상은 현재 리비전으로 다시 승인한다.
 for r in select w.id from public.bnc_jobs w where w.user_id=p_user_id and w.state='ready' and w.approval_revision is distinct from s.revision and w.expires_at>t
   and w.kind=any(a.tasks) and w.approval_hash=encode(sha256(convert_to(w.body,'UTF8')),'hex') order by w.created_at limit 20 loop
  begin perform public.bnc_dispatch(p_user_id,'approve',jsonb_build_object('id',r.id));n_refresh:=n_refresh+1;exception when others then null;end;
 end loop;
 if 'like'=any(a.tasks) then
  v_left:=least(10,s.like_cap-(select count(*) from public.bnc_jobs where user_id=p_user_id and kind='like' and created_at>=v_start and state<>'skipped'));
  for r in select x.account_id,x.neighbor_id,x.post_id from public.bnc_post_targets x
    join public.member_platform_accounts acc on acc.id=x.account_id and acc.user_id=p_user_id and acc.platform='naver_blog' and not acc.needs_reconnect and acc.id=d.account_id
    join public.bnc_neighbor_directory b on b.user_id=p_user_id and b.account_id=x.account_id and b.neighbor_id=x.neighbor_id and b.new_posts_enabled
    where x.user_id=p_user_id and x.expires_at>t and x.created_at>t-interval '3 days' and x.neighbor_id<>acc.external_id
     and not exists(select 1 from public.bnc_jobs w where w.user_id=p_user_id and w.actor_id=acc.external_id and w.neighbor_id=x.neighbor_id and w.post_id=x.post_id and w.kind='like')
    order by x.created_at,x.id limit greatest(v_left,0) loop
   begin
    v:=public.bnc_dispatch(p_user_id,'create',jsonb_build_object('account_id',r.account_id,'neighbor_id',r.neighbor_id,'post_id',r.post_id,'kind','like','body',''));
    perform public.bnc_dispatch(p_user_id,'approve',jsonb_build_object('id',v->>'id'));n_like:=n_like+1;
   exception when others then null;end;
  end loop;
 end if;
 if 'comment'=any(a.tasks) then
  v_left:=least(10,s.comment_cap-(select count(*) from public.bnc_jobs where user_id=p_user_id and budget_kind='comment' and created_at>=v_start and state<>'skipped'));
  -- 감시 AI가 만들고 품질 검사를 통과한(succeeded) 댓글 초안만. 회원이 직접 만든 초안은 회원이 채택한다.
  for r in select m.id,m.result->>'text' as body from public.bnc_message_jobs m
    join public.bnc_monitor_attempts ma on ma.id=m.id and ma.user_id=p_user_id and ma.state='succeeded'
    where m.user_id=p_user_id and m.kind='comment' and m.state='succeeded' and m.draft_job_id is null and m.expires_at>t and m.account_id=d.account_id
    order by m.created_at,m.id limit greatest(v_left,0) loop
   begin
    v:=public.bnc_message_dispatch(p_user_id,'adopt',jsonb_build_object('id',r.id,'text',r.body,'confirmed',true));
    perform public.bnc_dispatch(p_user_id,'approve',jsonb_build_object('id',v->>'draftJobId'));n_comment:=n_comment+1;
   exception when others then null;end;
  end loop;
 end if;
 return jsonb_build_object('paused',false,'auto',true,'prepared',n_like+n_comment,'likes',n_like,'comments',n_comment,'reapproved',n_refresh);
end $$;
revoke all on function public.bnc_autopilot_prepare(uuid,uuid) from public,anon,authenticated;
grant execute on function public.bnc_autopilot_prepare(uuid,uuid) to service_role;
commit;
