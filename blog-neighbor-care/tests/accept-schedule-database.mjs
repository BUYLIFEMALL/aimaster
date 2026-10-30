import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createAcceptSchedule,ACCEPT_SCHEDULE_ALARM} from '../extension/accept-schedule.mjs';
import {createAcceptHandler} from '../src/lib/neighbors/acceptApi.ts';
import {createContextReader} from '../extension/context-bridge.mjs';
import {createAcceptBridge} from '../extension/accept-bridge.mjs';
import {operateIncomingRequests} from '../extension/accept-dom.mjs';
import {createExtensionExecutionHandler} from '../src/lib/execution/extensionApi.ts';
import {createWorkBridge} from '../extension/work-bridge.mjs';
const migration='20261030150000_bnc_accept_schedule.sql';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-accept-schedule-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
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
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql','../supabase/migrations/20261029140000_bnc_engagement_inbox.sql','../supabase/migrations/20261028143000_bnc_schedule_preferences.sql','../supabase/migrations/20261029044735_bnc_schedule_cursor.sql','../supabase/migrations/20261030001500_bnc_extension_execution.sql','../supabase/migrations/20261030120000_bnc_extension_schedule.sql','../supabase/migrations/20261030133000_bnc_incoming_accept.sql',`../supabase/migrations/${migration}`])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 sql("update bnc_runtime set live_allowed=true,policy_reference='isolated-fixture-only';");
 const exec=(a,op,p={})=>JSON.parse(sql(`select bnc_extension_execute(${q(a.user)},${q(a.device)},${q(op)},${payload(['status','stop','cleanup'].includes(op)?p:{profile_hash:'f'.repeat(64),...p})});`,'service_role'));
 const grant=a=>JSON.parse(sql(`select bnc_extension_permission_dispatch(${q(a.user)},'grant',${payload({device_id:a.device,confirmed:true,kinds:['request','like','comment','reply']})});`,'service_role'));
 const job=a=>dispatch(a,'approve',{id:dispatch(a,'create',{account_id:a.account,neighbor_id:'fixture-neighbor',post_id:'123',kind:'like'}).id});
 const offer=(a,id=randomUUID())=>({id,target_kind:'post',owner:'fixture-neighbor',post_id:'123',kinds:['like'],next_hash:'b'.repeat(64)});
 const observation=a=>({articleHash:'d'.repeat(64),articleCharacters:1000,accountId:a.account,actorId:a.actor,neighborId:'fixture-neighbor',postId:'123',checkedAt:new Date().toISOString(),restriction:'none',relationship:'mutual',liked:false,duplicate:false});


 const call=(a,op,p={},device=a.device)=>JSON.parse(sql(`select bnc_accept_dispatch(${q(a.user)},${device?q(device):'null'},${q(op)},${payload({profile_hash:'f'.repeat(64),read_enabled:true,execute_enabled:true,...p})});`,'service_role'));
 const permit=(a,execute=true)=>call(a,'grant',{device_id:a.device,read:true,execute,confirmed:true},null);
 const snap=(a,key='request-1')=>({accountId:a.account,actorId:a.actor,checkedAt:new Date().toISOString(),restriction:'none',complete:true,count:1,requests:[{requestId:key,neighborId:'fixture-neighbor',state:'pending'}]});
 const read=a=>{const r=call(a,'offer_read',{id:randomUUID(),owner:a.actor,next_hash:'b'.repeat(64)});call(a,'preview',{id:r.id,nonce_hash:'b'.repeat(64),next_hash:'c'.repeat(64),snapshot:snap(a)});return call(a,'confirm',{id:r.id,nonce_hash:'c'.repeat(64),next_hash:'d'.repeat(64),snapshot:snap(a)});};
 const approved=a=>{read(a);const x=call(a,'list')[0],j=call(a,'draft',{id:x.id,confirmed:true},null);call(a,'approve',{id:j.id,confirmed:true},null);return j;};
 const one=a=>({accountId:a.account,actorId:a.actor,neighborId:'fixture-neighbor',requestId:'request-1',checkedAt:new Date().toISOString(),restriction:'none',state:'pending'});
 const offered=a=>call(a,'offer_work',{id:randomUUID(),owner:a.actor,next_hash:'b'.repeat(64)});
 const inspect=(a,r)=>call(a,'inspect',{id:r.id,nonce_hash:'b'.repeat(64),next_hash:'c'.repeat(64),snapshot:one(a)});
 const arm=(a,r)=>call(a,'arm',{id:r.id,nonce_hash:'c'.repeat(64),next_hash:'d'.repeat(64),snapshot:one(a)});
 const scheduled=a=>call(a,'scheduled_offer',{owner:a.actor,id:randomUUID(),next_hash:'b'.repeat(64)});
 const due=a=>sql(`update bnc_schedule_cursor set next_due_at=clock_timestamp()-interval '1 second' where user_id=${q(a.user)};`);
 const prepared=()=>{const a=fixture();permit(a);approved(a);assert.equal(scheduled(a).reason,'scheduled');due(a);return a;};
 const control=(a,op='status',p={})=>JSON.parse(sql(`select bnc_schedule_control(${q(a.user)},${q(op)},${payload(p)});`,'service_role'));
 await check('ASDB01 service-only RPCs; schedule initializes and waits without reserving or accepting',()=>{
  const a=fixture();permit(a);approved(a);
  for(const role of ['anon','authenticated'])assert.throws(()=>sql(`select bnc_accept_dispatch(${q(a.user)},${q(a.device)},'scheduled_offer','{}');`,role),/permission denied/);
  assert.equal(scheduled(a).reason,'scheduled');assert.equal(scheduled(a).reason,'not_due');assert.equal(sql(`select count(*) from bnc_daily where user_id=${q(a.user)}`),'0');
 });
 await check('ASDB02 due acceptance leases common cursor once; ordinary claims/second accept cannot overlap',async()=>{
  const a=prepared(),readyJob=job(a),r=scheduled(a);assert.equal(r.phase,'inspect');assert.equal(scheduled(a).reason,'busy');
  assert.throws(()=>offered(a),/SCHEDULE_BUSY/);assert.throws(()=>sql(`update bnc_jobs set state='claimed' where id=${q(readyJob.id)}`,'service_role'),/SCHEDULE_BUSY/);
  assert.equal(inspect(a,r).phase,'recheck');assert.equal(arm(a,r).phase,'apply');
  const result=call(a,'effect',{id:r.id,nonce_hash:'d'.repeat(64),snapshot:{...one(a),state:'mutual'},attempted_at:new Date().toISOString()});assert.equal(result.state,'succeeded');assert.equal(result.scheduleState,'idle');assert.ok(Date.parse(result.nextDueAt)>Date.now());assert.equal(control(a).last_result,'succeeded');assert.equal(scheduled(a).reason,'not_due');
 });
 await check('ASDB03 shared due window/revision/permission gates are rechecked before acceptance',()=>{
  const a=prepared();sql(`update bnc_schedule_preferences set start_minute=((extract(hour from(clock_timestamp() at time zone 'Asia/Seoul'))::integer*60+extract(minute from(clock_timestamp() at time zone 'Asia/Seoul'))::integer+60)%1440),end_minute=((extract(hour from(clock_timestamp() at time zone 'Asia/Seoul'))::integer*60+extract(minute from(clock_timestamp() at time zone 'Asia/Seoul'))::integer+61)%1440) where user_id=${q(a.user)};`);assert.equal(scheduled(a).reason,'outside_window');
  const b=prepared(),r=scheduled(b);sql(`update bnc_schedule_preferences set revision=revision+1 where user_id=${q(b.user)}`);assert.throws(()=>inspect(b,r),/STALE_REVISION/);assert.equal(call(b,'stop',{id:r.id}).scheduleState,'idle');
  const c=prepared();permit(c,false);assert.throws(()=>scheduled(c),/ACCEPT_NOT_READY/);assert.equal(control(c).state,'idle');
 });
 await check('ASDB04 armed uncertainty pauses shared cursor, retains budget and requires read-only proof then explicit recovery',()=>{
  const a=prepared(),r=scheduled(a);inspect(a,r);arm(a,r);assert.equal(call(a,'stop',{id:r.id}).scheduleState,'paused');let c=control(a);assert.equal(c.resumable,false);
  const check=call(a,'offer_check',{owner:a.actor,next_hash:'e'.repeat(64)});call(a,'reconcile',{id:check.id,nonce_hash:'e'.repeat(64),snapshot:one(a)});assert.equal(control(a).resumable,false);assert.equal(sql(`select reserved from bnc_daily where user_id=${q(a.user)}`),'1');
  call(a,'reconcile',{id:check.id,nonce_hash:'e'.repeat(64),snapshot:{...one(a),state:'mutual'}});c=control(a);assert.equal(c.resumable,true);assert.equal(c.executionEnabled,false);
  const p={run_id:c.run_id,generation:c.generation,settings_revision:c.settings_revision,preference_revision:c.preference_revision,confirmed:true};assert.throws(()=>control(a,'resume',{...p,generation:c.generation+1}),/SCHEDULE_CHANGED/);assert.equal(control(a,'resume',p).resumed,true);assert.equal(control(a).state,'idle');assert.equal(control(a).executionEnabled,false);assert.throws(()=>call(a,'effect',{id:r.id,nonce_hash:'d'.repeat(64),snapshot:{...one(a),state:'mutual'},attempted_at:new Date().toISOString()}));
 });
 await check('ASDB05 timed-out lease never repeats and ordinary work cannot finish the acceptance lease',()=>{
  const a=prepared(),r=scheduled(a),c=control(a);assert.throws(()=>sql(`select bnc_schedule_tick(${q(a.user)},'finish',${payload({run_id:c.run_id,generation:c.generation,blocked:false})});`,'service_role'),/STALE_RUN/);
  sql(`update bnc_schedule_cursor set running_until=clock_timestamp()-interval '1 second' where user_id=${q(a.user)}`);assert.equal(scheduled(a).reason,'result_check_required');assert.equal(control(a).state,'paused');assert.equal(sql(`select enabled from bnc_settings where user_id=${q(a.user)}`),'f');assert.equal(call(a,'stop',{id:r.id}).state,'skipped');assert.equal(control(a).resumable,true);
 });
 await check('ASDB06 extension alarm -> API -> actual cursor -> one reported acceptance; next wake never duplicates',async()=>{
  const a=fixture();permit(a);approved(a);let clicks=0;const store={},calls=[];
  const handler=createAcceptHandler({authorize:async()=>({allowed:true,userId:a.user,deviceId:a.device}),profile:()=>({profile:{v:1,reviewed:true,reference:'fixture-only',incomingRequestPath:'/FixtureInvitations.naver'},read:true,execute:true}),rpc:async(u,d,op,p)=>{try{return {data:JSON.parse(sql(`select bnc_accept_dispatch(${q(u)},${q(d)},${q(op)},${payload(p)});`,'service_role')),error:null};}catch{return {data:null,error:{message:'isolated reject'}};}}});
  const post=async(op,p)=>{calls.push(op);const response=await handler(new Request('https://fixture.test/api/neighbors/requests/extension',{method:'POST',headers:{authorization:`Bearer ${'a'.repeat(64)}`,'content-type':'application/json'},body:JSON.stringify({operation:op,payload:p})}));const v=await response.json();assert.equal(response.status,200,JSON.stringify(v));return v.data;};
  const browser={storage:{session:{get:async k=>({[k]:store[k]}),set:async v=>Object.assign(store,v),remove:async k=>delete store[k]}},alarms:{create:async()=>{},clear:async()=>{}},tabs:{query:async()=>[{id:7,windowId:8,url:`https://admin.blog.naver.com/${a.actor}`}]},windows:{get:async()=>({focused:true,state:'normal'})},scripting:{executeScript:async options=>{const c=options.args[0];let result;if(c.operation==='apply'){assert.ok(store.acceptAttempts[c.job.id]);clicks++;result=true;}else result={...one(a),checkedAt:Date.now(),state:clicks?'mutual':'pending'};return [{frameId:1,result}];}}};
  const who=async()=>({deviceId:a.device,blogId:a.actor}),acceptance=createAcceptBridge(browser,who,post),loop=createAcceptSchedule(browser,who,acceptance);
  await loop.start(true);assert.equal(clicks,0);await loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.equal(clicks,0);due(a);await loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.equal(clicks,1);assert.equal(store.acceptSchedule.remaining,119);assert.match((await loop.status()).message,/완료/);await loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.equal(clicks,1);assert.equal(calls.filter(v=>v==='effect').length,1);assert.equal(control(a).last_result,'succeeded');
 });
 await check('ASDB07 concurrent workers acquire once; daily cap and paused cursor cannot be bypassed manually',async()=>{
  const a=prepared();const command=()=>`select bnc_accept_dispatch(${q(a.user)},${q(a.device)},'scheduled_offer',${payload({owner:a.actor,id:randomUUID(),next_hash:'b'.repeat(64),profile_hash:'f'.repeat(64),execute_enabled:true,read_enabled:true})});`;
  const results=(await Promise.all([asyncSql('set role service_role;'+command()),asyncSql('set role service_role;'+command())])).map(JSON.parse);assert.equal(results.filter(r=>r.phase==='inspect').length,1);assert.equal(results.filter(r=>r.reason==='busy').length,1);
  const r=results.find(r=>r.phase==='inspect');sql(`insert into bnc_daily(user_id,day,kind,succeeded) values(${q(a.user)},(clock_timestamp() at time zone 'Asia/Seoul')::date,'request',20);`);assert.throws(()=>inspect(a,r),/DAILY_CAP/);assert.equal(sql(`select reserved from bnc_daily where user_id=${q(a.user)}`),'0');call(a,'stop',{id:r.id});
  const b=prepared(),rb=scheduled(b);sql(`update bnc_schedule_cursor set state='paused' where user_id=${q(b.user)}`);assert.throws(()=>offered(b),/SCHEDULE_BUSY/);assert.throws(()=>inspect(b,rb),/STALE_RUN/);
 });
 await check('ASDB08 lost scheduled offer response can be stopped by server-owned status without a second offer or click',async()=>{
  const a=prepared();const r=scheduled(a),status=call(a,'status_work');assert.equal(status.id,r.id);assert.equal(status.state,'ready');const calls=[];
  const browser={storage:{session:{get:async()=>({}),remove:async()=>{}}}};
  const bridge=createAcceptBridge(browser,async()=>({deviceId:a.device,blogId:a.actor}),async(op,p)=>{calls.push(op);return call(a,op,p);});
  assert.equal((await bridge.stop(true)).state,'skipped');assert.deepEqual(calls,['status_work','stop']);assert.equal(control(a).state,'idle');assert.equal(control(a).last_result,'blocked');assert.equal(sql(`select count(*) from bnc_daily where user_id=${q(a.user)}`),'0');
 });
 await check('ASDB09 settings changes require explicit re-review; cancelled scheduled jobs can later use one-shot mode',()=>{
  const a=prepared(),j=call(a,'list')[0];sql(`update bnc_settings set revision=revision+1 where user_id=${q(a.user)}`);assert.throws(()=>scheduled(a),/STALE_REVISION/);assert.equal(call(a,'approve',{id:j.job_id,confirmed:true},null).state,'ready');const r=scheduled(a);assert.equal(r.phase,'inspect');assert.throws(()=>call(a,'approve',{id:r.id,confirmed:true},null),/INVALID_STATE/);
  call(a,'stop',{id:r.id});call(a,'approve',{id:r.id,confirmed:true},null);const manual=offered(a);assert.equal(manual.phase,'inspect');assert.equal(inspect(a,manual).phase,'recheck');assert.equal(call(a,'stop',{id:manual.id}).state,'skipped');assert.equal(control(a).state,'idle');
 });
 const evidence={date:new Date().toISOString(),migration,tests,passed:tests.length,sqlCalls,isolated:true,operatingApplied:false,actualPlatformActions:0};writeFileSync(new URL('../docs/evidence/accept-schedule-database-20261030.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({passed:tests.length,sqlCalls}));
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}
