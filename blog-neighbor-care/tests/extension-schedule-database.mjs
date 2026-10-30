import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createExtensionExecutionHandler} from '../src/lib/execution/extensionApi.ts';
import {createWorkBridge} from '../extension/work-bridge.mjs';
const migration='20261030120000_bnc_extension_schedule.sql';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-extension-schedule-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
assert.match(container,/^[a-f0-9]{64}$/);
const args=['exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres'];
const q=v=>`'${String(v).replaceAll("'","''")}'`,payload=v=>`${q(JSON.stringify(v))}::jsonb`;
let sqlCalls=0;const tests=[];
const sql=(text,role='postgres')=>{sqlCalls++;return execFileSync('docker',args,{input:(role==='postgres'?'':`set role ${role};`)+text,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();};
const asyncSql=text=>new Promise((resolve,reject)=>{sqlCalls++;const p=spawn('docker',args,{windowsHide:true});let out='',err='';p.stdout.on('data',v=>out+=v);p.stderr.on('data',v=>err+=v);p.on('error',reject);p.on('close',c=>c?reject(Error(err)):resolve(out.trim()));p.stdin.end(text);});
const dispatch=(a,op,p={})=>JSON.parse(sql(`select bnc_dispatch(${q(a.user)},${q(op)},${payload(p)});`,'service_role'));
const inboxSql=(a,op,p={})=>`select bnc_engagement_dispatch(${q(a.user)},${q(op)},${payload(p)});`;
const inbox=(a,op,p={})=>JSON.parse(sql(inboxSql(a,op,p),'service_role'));
async function check(name,fn){await fn();tests.push(name);console.log(`ok ${tests.length} - ${name}`);}
function fixture(){
 const a={user:randomUUID(),account:randomUUID(),device:randomUUID(),actor:`fixture-${randomUUID()}`};
 sql(`insert into auth.users values(${q(a.user)});insert into member_platform_accounts(id,user_id,platform,external_id,access_token) values(${q(a.account)},${q(a.user)},'naver_blog',${q(a.actor)},'fixture-only');`);
 dispatch(a,'configure',{enabled:true});
 sql(`insert into bnc_reader_devices(id,user_id,account_id,blog_id,token_hash,device_name) values(${q(a.device)},${q(a.user)},${q(a.account)},${q(a.actor)},${q(createHash('sha256').update(a.device).digest('hex'))},'Fixture Edge');`);
 return a;
}
function source(a,returnPost='456'){
 const id=randomUUID();sql(`insert into bnc_engagement_inbox(id,user_id,account_id,actor_id,neighbor_id,own_post_id,comment_id,return_post_id,observed_at,expires_at)
 values(${q(id)},${q(a.user)},${q(a.account)},${q(a.actor)},'fixture-neighbor','123',${q(`comment-${id}`)},${returnPost===null?'null':q(returnPost)},statement_timestamp()-interval '1 minute',statement_timestamp()-interval '1 minute'+interval '720 hours');`);
 return id;
}
try{
 let ready=false;for(let i=0;i<100;i++){try{assert.equal(execFileSync('docker',['exec',container,'cat','/proc/1/comm'],{encoding:'utf8',windowsHide:true}).trim(),'postgres');sql('select 1;');ready=true;break;}catch{await new Promise(r=>setTimeout(r,150));}}assert.ok(ready);
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql','../supabase/migrations/20261029140000_bnc_engagement_inbox.sql','../supabase/migrations/20261028143000_bnc_schedule_preferences.sql','../supabase/migrations/20261029044735_bnc_schedule_cursor.sql','../supabase/migrations/20261030001500_bnc_extension_execution.sql',`../supabase/migrations/${migration}`])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 sql("update bnc_runtime set live_allowed=true,policy_reference='isolated-fixture-only';");
 const exec=(a,op,p={})=>JSON.parse(sql(`select bnc_extension_execute(${q(a.user)},${q(a.device)},${q(op)},${payload(['status','stop','cleanup'].includes(op)?p:{profile_hash:'f'.repeat(64),...p})});`,'service_role'));
 const grant=a=>JSON.parse(sql(`select bnc_extension_permission_dispatch(${q(a.user)},'grant',${payload({device_id:a.device,confirmed:true,kinds:['request','like','comment','reply']})});`,'service_role'));
 const job=a=>dispatch(a,'approve',{id:dispatch(a,'create',{account_id:a.account,neighbor_id:'fixture-neighbor',post_id:'123',kind:'like'}).id});
 const offer=(a,id=randomUUID())=>({id,target_kind:'post',owner:'fixture-neighbor',post_id:'123',kinds:['like'],next_hash:'b'.repeat(64)});
 const observation=a=>({articleHash:'d'.repeat(64),articleCharacters:1000,accountId:a.account,actorId:a.actor,neighborId:'fixture-neighbor',postId:'123',checkedAt:new Date().toISOString(),restriction:'none',relationship:'mutual',liked:false,duplicate:false});

 const scheduled=(a,p=offer(a))=>exec(a,'scheduled_offer',p);
 const prefs=a=>sql(`select bnc_schedule_preferences_dispatch(${q(a.user)},'get','{}');update bnc_schedule_preferences set start_minute=0,end_minute=0,interval_minutes=30 where user_id=${q(a.user)};`,'service_role');
 const due=a=>sql(`update bnc_schedule_cursor set next_due_at=clock_timestamp()-interval '1 second' where user_id=${q(a.user)};`);
 function begin(a){
  const r=scheduled(a),o=observation(a);assert.equal(r.phase,'inspect');
  const x={id:r.id,nonce_hash:'b'.repeat(64),next_hash:'c'.repeat(64),kinds:['like'],observation:o};assert.equal(exec(a,'inspect',x).phase,'reading');
  return {r,x};
 }
 function acquire(a,f){
  sql(`update bnc_extension_runs set read_not_before=clock_timestamp()-interval '1 second' where id=${q(f.r.id)};`);
  return exec(a,'reading',{...f.x,nonce_hash:'c'.repeat(64),next_hash:'d'.repeat(64),observation:observation(a)});
 }
 await check('ESDB01 read-only token and member roles cannot initialize or mutate a schedule',()=>{
  const a=fixture();job(a);assert.throws(()=>scheduled(a),/EXTENSION_NOT_READY/);assert.equal(sql(`select count(*) from bnc_schedule_preferences where user_id=${q(a.user)};`),'0');
  for(const role of ['anon','authenticated'])assert.throws(()=>sql(`select bnc_extension_execute(${q(a.user)},${q(a.device)},'scheduled_offer','{}');`,role),/permission denied/);
 });
 await check('ESDB02 initialization schedules from now; repeated wakeups before due create no run or reservation',()=>{
  const a=fixture();job(a);grant(a);prefs(a);const first=scheduled(a);assert.equal(first.reason,'scheduled');assert.ok(Date.parse(first.nextDueAt)>Date.now()+29*60000);
  assert.equal(scheduled(a).reason,'not_due');assert.equal(sql(`select count(*) from bnc_extension_runs where user_id=${q(a.user)};`),'0');assert.equal(sql(`select count(*) from bnc_daily where user_id=${q(a.user)};`),'0');
 });
 await check('ESDB03 server reading gate commits before cursor acquisition; success settles cursor/result together exactly once',()=>{
  const a=fixture(),j=job(a);grant(a);prefs(a);scheduled(a);due(a);const f=begin(a);
  assert.equal(sql(`select state from bnc_schedule_cursor where user_id=${q(a.user)};`),'idle');
  assert.throws(()=>exec(a,'reading',{...f.x,nonce_hash:'c'.repeat(64)}),/READING_REQUIRED/);assert.equal(sql(`select state from bnc_schedule_cursor where user_id=${q(a.user)};`),'idle');
  assert.equal(acquire(a,f).phase,'recheck');assert.equal(sql(`select state from bnc_schedule_cursor where user_id=${q(a.user)};`),'running');
  const armed=exec(a,'recheck',{...f.x,nonce_hash:'d'.repeat(64),next_hash:'e'.repeat(64),observation:observation(a)});assert.equal(armed.phase,'apply');
  const time=new Date().toISOString(),result=exec(a,'effect',{id:f.r.id,nonce_hash:'e'.repeat(64),next_hash:'f'.repeat(64),kinds:['like'],attempted_at:time,effect:{...observation(a),checkedAt:new Date().toISOString(),state:'liked'}});
  assert.equal(result.state,'succeeded');assert.equal(result.scheduleState,'idle');assert.ok(Date.parse(result.nextDueAt)>Date.now());assert.equal(sql(`select state from bnc_jobs where id=${q(j.id)}`),'succeeded');
  assert.equal(sql(`select generation from bnc_schedule_cursor where user_id=${q(a.user)}`),'1');assert.equal(exec(a,'stop',{id:f.r.id}).phase,'done');assert.equal(sql(`select generation from bnc_schedule_cursor where user_id=${q(a.user)}`),'1');
 });
 await check('ESDB04 preference/account/device changes cannot reuse a prepared scheduled run; cancellation before claim does not consume quota',()=>{
  const a=fixture();job(a);grant(a);prefs(a);scheduled(a);due(a);const f=begin(a);sql(`update bnc_schedule_preferences set revision=revision+1 where user_id=${q(a.user)};`);
  assert.throws(()=>acquire(a,f),/STALE_REVISION/);assert.equal(exec(a,'stop',{id:f.r.id}).phase,'done');assert.equal(sql(`select count(*) from bnc_daily where user_id=${q(a.user)};`),'0');
  const b=fixture();assert.throws(()=>exec(b,'reading',{...f.x,nonce_hash:'c'.repeat(64)}),/NOT_FOUND/);
 });
 await check('ESDB05 stopping after arm pauses cursor, disables execution and never retries the uncertain work',()=>{
  const a=fixture(),j=job(a);grant(a);prefs(a);scheduled(a);due(a);const f=begin(a);acquire(a,f);exec(a,'recheck',{...f.x,nonce_hash:'d'.repeat(64),next_hash:'e'.repeat(64),observation:observation(a)});
  exec(a,'stop',{id:f.r.id});assert.equal(sql(`select state from bnc_jobs where id=${q(j.id)};`),'uncertain');assert.equal(sql(`select state from bnc_schedule_cursor where user_id=${q(a.user)};`),'paused');assert.equal(sql(`select enabled from bnc_settings where user_id=${q(a.user)};`),'f');assert.equal(scheduled(a).reason,'disabled');
 });
 await check('ESDB06 expired running lease pauses even without another ready job; outside KST window does not read or claim',()=>{
  const a=fixture();job(a);grant(a);prefs(a);scheduled(a);due(a);const f=begin(a);acquire(a,f);sql(`update bnc_schedule_cursor set running_until=clock_timestamp()-interval '1 second' where user_id=${q(a.user)};`);assert.equal(scheduled(a).reason,'result_check_required');assert.equal(sql(`select enabled from bnc_settings where user_id=${q(a.user)};`),'f');
  const b=fixture();job(b);grant(b);prefs(b);scheduled(b);due(b);sql(`update bnc_schedule_preferences set start_minute=(extract(hour from (clock_timestamp() at time zone 'Asia/Seoul'))::integer*60+extract(minute from (clock_timestamp() at time zone 'Asia/Seoul'))::integer+5)%1440,end_minute=(extract(hour from (clock_timestamp() at time zone 'Asia/Seoul'))::integer*60+extract(minute from (clock_timestamp() at time zone 'Asia/Seoul'))::integer+6)%1440 where user_id=${q(b.user)};`);assert.equal(scheduled(b).reason,'outside_window');assert.equal(sql(`select count(*) from bnc_extension_runs where user_id=${q(b.user)};`),'0');
 });
 await check('ESDB07 extension alarm -> work bridge -> HTTP handler -> real cursor and evidence completes one approved action',async()=>{
  const a=fixture(),j=job(a);grant(a);prefs(a);scheduled(a);due(a);let elapsed=0,applies=0;const session={},calls=[];
  const handler=createExtensionExecutionHandler({authorize:async()=>({allowed:true,userId:a.user,deviceId:a.device}),profile:()=>({profile:{v:1,reviewed:true,reference:'synthetic-only'},kinds:['like']}),rpc:async(u,d,op,p)=>{assert.equal(u,a.user);assert.equal(d,a.device);try{return {data:exec(a,op,p),error:null};}catch(e){return {data:null,error:{message:e.message}};}}});
  const post=async(op,p)=>{calls.push(op);if(op==='reading')sql(`update bnc_extension_runs set read_not_before=clock_timestamp()-interval '1 second' where id=${q(p.id)};`);const response=await handler(new Request('https://fixture.test/api/execution/extension',{method:'POST',headers:{authorization:`Bearer ${'e'.repeat(64)}`,'content-type':'application/json'},body:JSON.stringify({operation:op,payload:p})}));const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result.data;};
  const browser={storage:{session:{get:async k=>({[k]:session[k]}),set:async v=>Object.assign(session,v),remove:async k=>delete session[k]}},alarms:{create:async()=>{},clear:async()=>{}},tabs:{query:async()=>[{id:7,windowId:8,url:'https://blog.naver.com/fixture-neighbor/123'}]},windows:{get:async()=>({focused:true,state:'normal'})},scripting:{executeScript:async options=>{const c=options.args[0];let result;const o={...observation(a),checkedAt:Date.now()};if(c.operation==='inspect')result=o;if(c.operation==='assert')result=true;if(c.operation==='apply'){applies++;result=true;}if(c.operation==='verify')result={...o,state:'liked'};return [{frameId:1,result}];}}};
  const who=async()=>({deviceId:a.device,blogId:a.actor}),work=createWorkBridge(browser,who,post,Date.now,async()=>false,{now:()=>elapsed,sleep:async ms=>{elapsed+=ms;}});
  const {createExtensionSchedule,SCHEDULE_ALARM}=await import('../extension/schedule-bridge.mjs');const alarm=createExtensionSchedule(browser,who,work);await alarm.start(true);assert.equal(applies,0);await alarm.alarm(SCHEDULE_ALARM);
  assert.equal(applies,1);assert.equal(session.scheduledWork.inFlight,false);assert.equal(session.scheduledWork.remaining,119);assert.ok(calls.includes('scheduled_offer'));assert.equal(sql(`select state from bnc_schedule_cursor where user_id=${q(a.user)};`),'idle');assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${q(j.id)};`),'1');
  await alarm.alarm(SCHEDULE_ALARM);assert.equal(applies,1);
 });
 const evidence={date:new Date().toISOString(),migration,tests,passed:tests.length,sqlCalls,isolated:true,operatingApplied:false,actualPlatformActions:0,scope:'current bound foreground tab only; approved jobs only; no scanning or automatic AI'};
 writeFileSync(new URL('../docs/evidence/extension-schedule-20261030.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({passed:tests.length,sqlCalls}));
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}
