import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {nextSchedulePreview} from '../src/lib/schedule.ts';
import {runScheduledWork} from '../src/lib/execution/scheduledWork.ts';
import {runTicketedWork} from '../src/lib/execution/trustedHost.ts';
import {issueWorkerTicket} from '../src/lib/execution/workerTicket.ts';
import {createScheduleWorker} from '../src/lib/execution/scheduleWorker.ts';
import {checkRequestedRelationship} from '../src/lib/execution/relationshipCheck.ts';
import {buildRequestStatuses} from '../src/lib/execution/requestStatus.ts';
const migration='20261029044735_bnc_schedule_cursor.sql';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-schedule-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
assert.match(container,/^[a-f0-9]{64}$/);
const args=['exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres'];
const q=v=>`'${String(v).replaceAll("'","''")}'`,payload=v=>`${q(JSON.stringify(v))}::jsonb`;
let sqlCalls=0;const tests=[];
const sql=(text,role='postgres')=>{sqlCalls++;return execFileSync('docker',args,{input:(role==='postgres'?'':`set role ${role};`)+text,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();};
const asyncSql=text=>new Promise((resolve,reject)=>{const p=spawn('docker',args,{windowsHide:true});let out='',err='';p.stdout.on('data',v=>out+=v);p.stderr.on('data',v=>err+=v);p.on('error',reject);p.on('close',c=>c?reject(Error(err)):resolve(out.trim()));p.stdin.end(text);});
const tickSql=(m,op,p={})=>`select bnc_schedule_tick(${q(m.user)},${q(op)},${payload(p)});`;
const tick=(m,op,p={})=>JSON.parse(sql(tickSql(m,op,p),'service_role'));
const dispatch=(m,op,p={})=>JSON.parse(sql(`select bnc_dispatch(${q(m.user)},${q(op)},${payload(p)});`,'service_role'));
async function check(name,fn){await fn();tests.push(name);console.log(`ok ${tests.length} - ${name}`);}
function fixture(){
 const m={user:randomUUID(),account:randomUUID(),device:randomUUID(),actor:`fixture-${randomUUID()}`};
 sql(`insert into auth.users values(${q(m.user)});insert into member_platform_accounts(id,user_id,platform,external_id,access_token) values(${q(m.account)},${q(m.user)},'naver_blog',${q(m.actor)},'fixture-only');`);
 dispatch(m,'configure',{enabled:true});
 sql(`insert into bnc_schedule_preferences(user_id,interval_minutes,start_minute,end_minute) values(${q(m.user)},30,0,0);
  insert into bnc_reader_devices(id,user_id,account_id,blog_id,token_hash,device_name) values(${q(m.device)},${q(m.user)},${q(m.account)},${q(m.actor)},${q(createHash('sha256').update(m.device).digest('hex'))},'Fixture Edge');`);
 const job=dispatch(m,'create',{account_id:m.account,neighbor_id:'fixture-neighbor',kind:'request',body:'fixture'});
 m.job=dispatch(m,'approve',{id:job.id}).id;
 m.start={job_id:m.job,device_id:m.device,preference_revision:1,settings_revision:2};
 return m;
}
const due=m=>sql(`update bnc_schedule_cursor set next_due_at=now()-interval '3 days' where user_id=${q(m.user)};`);
try{
 let ready=false;for(let i=0;i<100;i++){try{sql('select 1;');ready=true;break;}catch{await new Promise(r=>setTimeout(r,150));}}assert.ok(ready);
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth,public to anon,authenticated,service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028143000_bnc_schedule_preferences.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql',`../supabase/migrations/${migration}`])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 sql("update bnc_runtime set live_allowed=true,policy_reference='isolated-fixture-only';");
 const m=fixture(),other=fixture();
 await check('SDB01 first tick schedules future work without claiming/arming or catching up missed intervals',()=>{
  const r=tick(m,'begin',m.start);assert.equal(r.reason,'scheduled');assert.ok(Date.parse(r.next_due_at)>Date.now());
  assert.equal(tick(m,'begin',m.start).reason,'not_due');assert.equal(sql(`select state from bnc_jobs where id=${q(m.job)};`),'ready');
 });
 await check('SDB02 concurrent ticks acquire exactly one durable generation across processes',async()=>{
  due(m);const results=await Promise.all([1,2].map(()=>asyncSql(`set role service_role;${tickSql(m,'begin',m.start)}`)));
  const rows=results.map(JSON.parse);assert.equal(rows.filter(r=>r.acquired).length,1);assert.equal(rows.find(r=>!r.acquired).reason,'busy');
  m.cursor=rows.find(r=>r.acquired);assert.equal(m.cursor.generation,1);
 });
 const finish=(member,blocked=false)=>tick(member,'finish',{run_id:member.cursor.run_id,generation:member.cursor.generation,blocked});
 await check('SDB03 stale/cross-member settlements fail; caller cannot manufacture success',()=>{
  assert.throws(()=>tick(m,'finish',{run_id:randomUUID(),generation:1,blocked:true}),/BNC_STALE_RUN/);
  assert.throws(()=>tick(other,'finish',{run_id:m.cursor.run_id,generation:1,blocked:true}),/BNC_STALE_RUN/);
  const c=finish(m);assert.equal(c.state,'paused');assert.equal(c.last_result,'uncertain');assert.equal(sql(`select not enabled from bnc_settings where user_id=${q(m.user)};`),'t');
  assert.equal(tick(m,'begin',m.start).reason,'result_check_required');
 });
 await check('SDB04 expired running worker pauses even with runtime off; it never reclaims its job',()=>{
  tick(other,'begin',other.start);due(other);other.cursor=tick(other,'begin',other.start);
  sql(`update bnc_schedule_cursor set running_until=now()-interval '1 second' where user_id=${q(other.user)};update bnc_runtime set live_allowed=false;`);
  assert.equal(tick(other,'begin',other.start).reason,'result_check_required');assert.equal(sql(`select state from bnc_jobs where id=${q(other.job)};`),'ready');
  assert.equal(sql(`select not enabled from bnc_settings where user_id=${q(other.user)};`),'t');
  sql('update bnc_runtime set live_allowed=true;');
 });
 await check('SDB05 verified DB success advances from completion time; no backlog or replay',()=>{
  const a=fixture();tick(a,'begin',a.start);due(a);a.cursor=tick(a,'begin',a.start);
  sql(`update bnc_jobs set state='succeeded' where id=${q(a.job)};`);
  const c=finish(a);assert.equal(c.state,'idle');assert.equal(c.last_result,'succeeded');assert.ok(Date.parse(c.next_due_at)>Date.now()+29*60000);
  assert.throws(()=>finish(a),/BNC_STALE_RUN/);due(a);assert.equal(tick(a,'begin',a.start).reason,'job_unavailable');
 });
 await check('SDB06 settings/preference revisions, disconnected devices and unsettled jobs block execution',()=>{
  const a=fixture();tick(a,'begin',a.start);due(a);
  assert.throws(()=>tick(a,'begin',{...a.start,settings_revision:1}),/BNC_STALE_REVISION/);
  assert.throws(()=>tick(a,'begin',{...a.start,preference_revision:2}),/BNC_STALE_REVISION/);
  assert.equal(tick(a,'begin',{...a.start,device_id:other.device}).reason,'device_unavailable');
  sql(`update bnc_jobs set approval_revision=null where id=${q(a.job)};`);assert.equal(tick(a,'begin',a.start).reason,'job_unavailable');
  sql(`update bnc_jobs set approval_revision=2,state='uncertain' where id=${q(a.job)};`);assert.equal(tick(a,'begin',a.start).reason,'unsettled_work');
 });
 await check('SDB07 preference changes reschedule from now instead of draining past intervals',()=>{
  const a=fixture();tick(a,'begin',a.start);due(a);sql(`update bnc_schedule_preferences set revision=2 where user_id=${q(a.user)};`);
  assert.equal(tick(a,'begin',{...a.start,preference_revision:2}).reason,'scheduled');
 });
 await check('SDB08 KST daytime/overnight/end boundary matches existing preview across year end',()=>{
  for(const p of [{interval_minutes:30,start_minute:540,end_minute:1080},{interval_minutes:60,start_minute:1320,end_minute:120},{interval_minutes:1440,start_minute:0,end_minute:0}])
   for(const date of ['2026-12-31T17:40:00+09:00','2026-10-29T01:40:00+09:00','2026-10-28T08:20:00+09:00']){
    const actual=sql(`select extract(epoch from bnc_private.schedule_next(${q(date)},${p.interval_minutes},${p.start_minute},${p.end_minute}))*1000;`,'service_role');
    assert.equal(Number(actual),Date.parse(nextSchedulePreview(Date.parse(date),p)));
   }
 });
 await check('SDB09 RPC/direct writes denied to members; owner can only read own cursor',()=>{
  for(const role of ['anon','authenticated']){
   assert.throws(()=>sql(tickSql(m,'begin',m.start),role),/permission denied/);
   assert.throws(()=>sql(`update bnc_schedule_cursor set state='idle';`,role),/permission denied/);
  }
  assert.equal(sql(`set role authenticated;set request.jwt.claim.sub=${q(m.user)};select count(*) from bnc_schedule_cursor;`),'1');
  assert.equal(sql(`set role authenticated;set request.jwt.claim.sub=${q(randomUUID())};select count(*) from bnc_schedule_cursor;`),'0');
  assert.equal(sql("select count(*) from pg_proc where proname='bnc_schedule_tick' and prosecdef;"),'0');
 });
 await check('SDB10 blocked-without-effect advances once, keeps generation and rejects late settlement',()=>{
  const a=fixture();tick(a,'begin',a.start);due(a);a.cursor=tick(a,'begin',a.start);const c=finish(a,true);
  assert.equal(c.state,'idle');assert.equal(c.last_result,'blocked');assert.equal(c.generation,1);assert.equal(tick(a,'begin',a.start).reason,'not_due');assert.throws(()=>finish(a,true),/BNC_STALE_RUN/);
 });
 await check('SDB11 deletion during a running tick is allowed and pauses instead of inventing success',()=>{
  const a=fixture();tick(a,'begin',a.start);due(a);a.cursor=tick(a,'begin',a.start);
  sql(`delete from bnc_jobs where id=${q(a.job)};`);assert.equal(finish(a,true).state,'paused');
 });
 await check('SDB12 durable tick -> signed host -> claim/arm -> fixture effect -> atomic evidence -> next interval',async()=>{
  const a=fixture();tick(a,'begin',a.start);due(a);
  const secret='fixture-schedule-worker-secret-32bytes';let effects=0;
  const ticket=issueWorkerTicket({memberId:a.user,jobId:a.job,deviceId:a.device,accountId:a.account,actorId:a.actor,bodyHash:createHash('sha256').update('fixture').digest('hex'),approvalRevision:2,generation:1},secret);
  const context=()=>({accountId:a.account,actorId:a.actor,neighborId:'fixture-neighbor',postId:'',checkedAt:Date.now()});
  const store={member:async id=>({allowed:id===a.user,userId:id}),connected:async()=>true,permitted:async()=>true,
   load:async(user,id)=>JSON.parse(sql(`select to_jsonb(j) from bnc_jobs j where user_id=${q(user)} and id=${q(id)};`,'service_role')),
   rpc:async(user,op,p)=>dispatch({user},op,p),
   result:async(user,p)=>JSON.parse(sql(`select bnc_execution_result_dispatch(${q(user)},'result',${payload(p)});`,'service_role'))};
  const adapter={inspect:async()=>({...context(),restriction:'none',relationship:'none',liked:null,duplicate:false}),assertCurrent:async()=>true,
   apply:async()=>{effects++;},verify:async()=>({...context(),state:'pending'})};
  const deps={secret:()=>secret,authorize:store.member,tick:async(user,op,p)=>tick({user},op,p),execute:t=>runTicketedWork(t,{secret:()=>secret,store,adapter})};
  const outcome=await runScheduledWork(ticket,{preferences:1,settings:2},deps);
  assert.equal(outcome.status,'succeeded');assert.equal(effects,1);
  const c=tick(a,'status');assert.equal(c.state,'idle');assert.equal(c.last_result,'succeeded');
  assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${q(a.job)};`),'1');
  assert.equal((await runScheduledWork(ticket,{preferences:1,settings:2},deps)).status,'blocked');assert.equal(effects,1);
 });
 await check('SDB13 outside KST window, expired device and disabled gates never acquire a tick',()=>{
  const a=fixture();tick(a,'begin',a.start);due(a);
  const minute=Number(sql("select extract(hour from (clock_timestamp() at time zone 'Asia/Seoul'))::integer*60+extract(minute from (clock_timestamp() at time zone 'Asia/Seoul'))::integer;"));
  sql(`update bnc_schedule_preferences set start_minute=${(minute+10)%1440},end_minute=${(minute+20)%1440} where user_id=${q(a.user)};`);
  assert.equal(tick(a,'begin',a.start).reason,'outside_window');
  sql(`update bnc_schedule_preferences set start_minute=0,end_minute=0 where user_id=${q(a.user)};update bnc_reader_devices set expires_at=now()-interval '1 second' where id=${q(a.device)};`);
  assert.equal(tick(a,'begin',a.start).reason,'device_unavailable');
  sql('update bnc_runtime set live_allowed=false;');assert.equal(tick(a,'begin',a.start).reason,'disabled');sql('update bnc_runtime set live_allowed=true;');
  sql(`update bnc_settings set enabled=false where user_id=${q(a.user)};`);assert.equal(tick(a,'begin',a.start).reason,'disabled');
 });
 const control=(a,operation='status',p={})=>JSON.parse(sql(`select bnc_schedule_control(${q(a.user)},${q(operation)},${payload(p)});`,'service_role'));
 const recoveryPayload=c=>({run_id:c.run_id,generation:c.generation,settings_revision:c.settings_revision,preference_revision:c.preference_revision,confirmed:true});
 function pausedFixture(){const a=fixture();tick(a,'begin',a.start);due(a);a.cursor=tick(a,'begin',a.start);finish(a);return a;}
 await check('SDB14 recovery status never promotes uncertain/ready/deleted jobs to a confirmed result',()=>{
  const a=pausedFixture();assert.equal(control(a).resumable,false);
  assert.throws(()=>control(a,'resume',recoveryPayload(control(a))),/BNC_RESUME_BLOCKED/);
  sql(`update bnc_jobs set state='uncertain' where id=${q(a.job)};`);assert.equal(control(a).resumable,false);
  sql(`delete from bnc_jobs where id=${q(a.job)};`);assert.equal(control(a).resumable,false);
 });
 await check('SDB15 explicit reviewed recovery uses exact CAS, stays disabled, invalidates old finish and schedules from now',()=>{
  const a=pausedFixture();sql(`select bnc_work_cancel(${q(a.user)},${q(a.job)});`,'service_role');
  const before=control(a),p=recoveryPayload(before);assert.equal(before.resumable,true);
  assert.throws(()=>control(a,'resume',{...p,confirmed:false}),/BNC_INVALID_INPUT/);
  assert.throws(()=>control(a,'resume',{...p,settings_revision:p.settings_revision+1}),/BNC_SCHEDULE_CHANGED/);
  assert.throws(()=>control(other,'resume',p),/BNC_SCHEDULE_CHANGED/);
  sql('update bnc_runtime set live_allowed=false;');const after=control(a,'resume',p);
  assert.equal(after.resumed,true);assert.equal(after.executionEnabled,false);assert.equal(after.state,'idle');
  assert.equal(after.generation,before.generation+1);assert.equal(after.run_id,null);assert.ok(Date.parse(after.next_due_at)>Date.now()+29*60000);
  assert.equal(sql(`select state from bnc_jobs where id=${q(a.job)};`),'skipped');
  assert.equal(sql('select not live_allowed from bnc_runtime;'),'t');
  assert.throws(()=>control(a,'resume',p),/BNC_SCHEDULE_CHANGED/);assert.throws(()=>finish(a),/BNC_STALE_RUN/);
  sql('update bnc_runtime set live_allowed=true;');
 });
 await check('SDB16 another unsettled job or enabled execution prevents recovery; preference changes invalidate consent',()=>{
  const a=pausedFixture();sql(`update bnc_jobs set state='succeeded' where id=${q(a.job)};`);
  const before=control(a);assert.equal(before.resumable,true);const p=recoveryPayload(before);
  sql(`update bnc_schedule_preferences set revision=revision+1 where user_id=${q(a.user)};`);
  assert.throws(()=>control(a,'resume',p),/BNC_SCHEDULE_CHANGED/);
  const j=dispatch(a,'create',{account_id:a.account,neighbor_id:'another-neighbor',kind:'request',body:'private-fixture'});
  sql(`update bnc_jobs set state='uncertain' where id=${q(j.id)};`);assert.equal(control(a).resumable,false);
  sql(`update bnc_jobs set state='skipped' where id=${q(j.id)};update bnc_settings set enabled=true where user_id=${q(a.user)};`);
  assert.equal(control(a).resumable,false);
 });
 await check('SDB17 members cannot call control RPC directly or forge a result; response contains no body/credentials',()=>{
  for(const role of ['anon','authenticated'])assert.throws(()=>sql(`select bnc_schedule_control(${q(m.user)},'status','{}');`,role),/permission denied/);
  assert.throws(()=>control(m,'resume',{...recoveryPayload(control(m)),outcome:'success'}),/BNC_INVALID_INPUT/);
  const r=control(m);for(const key of ['body','user_id','device_id','approval_hash','token_hash','access_token'])assert.equal(Object.hasOwn(r,key),false);
  assert.equal(sql("select count(*) from pg_proc where proname='bnc_schedule_control' and prosecdef;"),'0');
 });
 await check('SDB18 first status initializes disabled preferences only, not jobs/cursor or execution',()=>{
  const a={user:randomUUID()};sql(`insert into auth.users values(${q(a.user)});`);
  const r=control(a);assert.equal(r.state,'uninitialized');assert.equal(r.resumable,false);assert.equal(r.executionEnabled,false);
  assert.equal(r.settings_revision,1);assert.equal(r.preference_revision,1);
  assert.equal(sql(`select count(*) from bnc_jobs where user_id=${q(a.user)};`),'0');
  assert.equal(sql(`select count(*) from bnc_schedule_cursor where user_id=${q(a.user)};`),'0');
 });
 let requested;
 await check('SDB19 bounded worker selects a ready DB job, issues its ticket, settles once and survives host recreation without replay',async()=>{
  const a=fixture();tick(a,'begin',a.start);due(a);let effects=0;
  const secret='fixture-polling-worker-secret-32bytes',binding={memberId:a.user,accountId:a.account,deviceId:a.device,actorId:a.actor};
  const context=()=>({accountId:a.account,actorId:a.actor,neighborId:'fixture-neighbor',postId:'',checkedAt:Date.now()});
  const store={member:async id=>({allowed:id===a.user,userId:id}),connected:async()=>true,permitted:async()=>true,
   load:async(user,id)=>JSON.parse(sql(`select to_jsonb(j) from bnc_jobs j where user_id=${q(user)} and id=${q(id)};`,'service_role')),
   rpc:async(user,op,p)=>dispatch({user},op,p),result:async(user,p)=>JSON.parse(sql(`select bnc_execution_result_dispatch(${q(user)},'result',${payload(p)});`,'service_role'))};
  const adapter={inspect:async()=>({...context(),restriction:'none',relationship:'none',liked:null,duplicate:false}),assertCurrent:async()=>true,
   apply:async()=>{effects++;},verify:async()=>({...context(),state:'pending'})};
  const dependencies={secret:()=>secret,context:async()=>{
   const settings=dispatch(a,'settings');return {memberId:a.user,allowed:true,connected:true,enabled:settings.enabled,liveAllowed:settings.live_allowed,
    settingsRevision:settings.revision,preferenceRevision:1,policyKinds:['request']};},
   jobs:async()=>JSON.parse(sql(`select coalesce(jsonb_agg(to_jsonb(j)),'[]') from bnc_jobs j where user_id=${q(a.user)} and state='ready';`,'service_role')),
   dispatch:(t,revisions)=>runScheduledWork(t,revisions,{secret:()=>secret,authorize:store.member,tick:async(user,op,p)=>tick({user},op,p),
    execute:value=>runTicketedWork(value,{secret:()=>secret,store,adapter})}),wait:async()=>{}};
  const results=await createScheduleWorker(binding,dependencies).run({signal:new AbortController().signal,cycles:2});
  assert.equal(results[0].status,'succeeded');assert.equal(results[1].reason,'no_approved_work');
  assert.equal((await createScheduleWorker(binding,dependencies).poll()).reason,'no_approved_work');assert.equal(effects,1);
  assert.equal(tick(a,'status').state,'idle');assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${q(a.job)};`),'1');
  assert.equal(sql(`select succeeded from bnc_daily where user_id=${q(a.user)} and kind='request';`),'1');
  requested=a;
 });
 await check('SDB20 successful request -> private relationship observation -> accepted projection without a second effect or budget use',async()=>{
  const a=requested;
  const load=async()=>({job:JSON.parse(sql(`select to_jsonb(j) from bnc_jobs j where id=${q(a.job)};`)),
   receipt:JSON.parse(sql(`select to_jsonb(e) from bnc_execution_evidence e where job_id=${q(a.job)};`))});
  const project=async()=>{const {job,receipt}=await load();return buildRequestStatuses(a.user,[job],
   JSON.parse(sql(`select jsonb_agg(to_jsonb(n)) from bnc_neighbors n where user_id=${q(a.user)};`)),[receipt],
   JSON.parse(sql(`select jsonb_agg(to_jsonb(c)) from member_platform_accounts c where user_id=${q(a.user)};`)));};
  assert.equal((await project())[0].state,'pending');
  let inspections=0;const before=sql(`select to_jsonb(d) from bnc_daily d where user_id=${q(a.user)};`);
  const outcome=await checkRequestedRelationship({memberId:a.user,jobId:a.job,accountId:a.account,deviceId:a.device,actorId:a.actor},{
   authorize:async user=>user===a.user,connected:async()=>true,permitted:async()=>true,load,
   observe:async(user,id,relationship)=>dispatch({user},'observe',{id,relationship,liked:null}),stop:async()=>assert.fail('Unexpected stop'),
   adapter:{inspect:async()=>{inspections++;return {accountId:a.account,actorId:a.actor,neighborId:'fixture-neighbor',checkedAt:Date.now(),restriction:'none',relationship:'mutual'};},assertCurrent:async()=>true}});
  assert.equal(outcome.status,'observed');assert.equal(outcome.externalActions,0);assert.equal(inspections,1);
  assert.equal((await project())[0].state,'accepted');
  assert.equal(sql(`select to_jsonb(d) from bnc_daily d where user_id=${q(a.user)};`),before);
  assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${q(a.job)};`),'1');
  assert.equal(sql(`select state from bnc_jobs where id=${q(a.job)};`),'succeeded');
 });
 const evidence={date:new Date().toISOString(),migration,tests,passed:tests.length,sqlCalls,isolated:true,network:'none',hostPorts:0,operatingApplied:false,productionCaller:false,externalActions:0};
 writeFileSync(new URL('../docs/evidence/schedule-worker-20261029.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({passed:tests.length,sqlCalls,operatingApplied:false}));
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}
