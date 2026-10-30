import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createAcceptHandler} from '../src/lib/neighbors/acceptApi.ts';
import {createContextReader} from '../extension/context-bridge.mjs';
import {createAcceptBridge} from '../extension/accept-bridge.mjs';
import {operateIncomingRequests} from '../extension/accept-dom.mjs';
import {createExtensionExecutionHandler} from '../src/lib/execution/extensionApi.ts';
import {createWorkBridge} from '../extension/work-bridge.mjs';
const migration='20261030133000_bnc_incoming_accept.sql';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-incoming-accept-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
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
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql','../supabase/migrations/20261029140000_bnc_engagement_inbox.sql','../supabase/migrations/20261028143000_bnc_schedule_preferences.sql','../supabase/migrations/20261029044735_bnc_schedule_cursor.sql','../supabase/migrations/20261030001500_bnc_extension_execution.sql','../supabase/migrations/20261030120000_bnc_extension_schedule.sql',`../supabase/migrations/${migration}`])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
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
 await check('ACDB01 service-only tables/RPC; separate read permission does not authorize acceptance or create jobs',()=>{
  const a=fixture();for(const role of ['anon','authenticated']){assert.throws(()=>sql(`select bnc_accept_dispatch(${q(a.user)},null,'list','{}');`,role),/permission denied/);for(const table of ['bnc_accept_permissions','bnc_accept_reads','bnc_incoming_requests','bnc_accept_jobs'])assert.throws(()=>sql(`select * from ${table};`,role),/permission denied/);}
  assert.throws(()=>read(a),/READ_NOT_PERMITTED/);permit(a,false);assert.equal(read(a).savedCount,1);assert.equal(sql(`select count(*) from bnc_accept_jobs where user_id=${q(a.user)}`),'0');const x=call(a,'list')[0],j=call(a,'draft',{id:x.id,confirmed:true},null);call(a,'approve',{id:j.id,confirmed:true},null);assert.throws(()=>offered(a),/ACCEPT_NOT_READY/);assert.equal(sql(`select count(*) from bnc_daily where user_id=${q(a.user)}`),'0');
 });
 await check('ACDB02 rereading preserves source identity/expiry; changed preview and cross-account device are rejected',()=>{
  const a=fixture();permit(a);read(a);const first=call(a,'list')[0];assert.equal(read(a).savedCount,0);assert.equal(call(a,'list')[0].expires_at,first.expires_at);
  const r=call(a,'offer_read',{id:randomUUID(),owner:a.actor,next_hash:'b'.repeat(64)});call(a,'preview',{id:r.id,nonce_hash:'b'.repeat(64),next_hash:'c'.repeat(64),snapshot:snap(a)});assert.throws(()=>call(a,'confirm',{id:r.id,nonce_hash:'c'.repeat(64),snapshot:{...snap(a),count:0,requests:[]}}),/READ_CHANGED/);call(a,'cancel',{id:r.id});
  const b=fixture();assert.throws(()=>call(a,'status_read',{},b.device),/ACCOUNT_REQUIRED/);
 });
 await check('ACDB03 explicit draft/approval -> two fresh checks -> single success updates shared budget and mutual relationship',()=>{
  const a=fixture();permit(a);approved(a);const r=offered(a);assert.equal(inspect(a,r).phase,'recheck');assert.equal(arm(a,r).phase,'apply');const attempted=new Date().toISOString();
  const result=call(a,'effect',{id:r.id,nonce_hash:'d'.repeat(64),next_hash:'e'.repeat(64),snapshot:{...one(a),state:'mutual'},attempted_at:attempted});assert.equal(result.state,'succeeded');assert.equal(sql(`select succeeded from bnc_daily where user_id=${q(a.user)} and kind='request'`),'1');assert.equal(sql(`select state from bnc_neighbors where user_id=${q(a.user)}`),'mutual');assert.equal(offered(a).phase,'idle');assert.equal(call(a,'stop',{id:r.id}).state,'succeeded');assert.doesNotMatch(JSON.stringify(call(a,'status_work')),/nonce|profile_hash|proof/);
 });
 await check('ACDB04 outgoing requests and accepts share cap; wrong request/profile cannot reserve',()=>{
  const a=fixture();permit(a);approved(a);const r=offered(a);assert.throws(()=>call(a,'inspect',{id:r.id,nonce_hash:'b'.repeat(64),next_hash:'c'.repeat(64),snapshot:{...one(a),requestId:'other'}}),/ACCEPT_CONTEXT/);assert.throws(()=>call(a,'inspect',{id:r.id,nonce_hash:'b'.repeat(64),profile_hash:'e'.repeat(64),snapshot:one(a)}),/STALE_RUN/);
  sql(`insert into bnc_daily(user_id,day,kind,succeeded) values(${q(a.user)},(clock_timestamp() at time zone 'Asia/Seoul')::date,'request',20);`);assert.throws(()=>inspect(a,r),/DAILY_CAP/);assert.equal(sql(`select reserved from bnc_daily where user_id=${q(a.user)}`),'0');
 });
 await check('ACDB05 arm uncertainty stops all execution, retains shared reservation and blocks outgoing extension work',()=>{
  const a=fixture();permit(a);approved(a);const r=offered(a);inspect(a,r);arm(a,r);assert.equal(call(a,'stop',{id:r.id}).state,'uncertain');assert.equal(sql(`select enabled from bnc_settings where user_id=${q(a.user)}`),'f');assert.equal(sql(`select reserved from bnc_daily where user_id=${q(a.user)}`),'1');
  assert.throws(()=>exec(a,'offer',offer(a)),/UNSETTLED_ACCEPT/);assert.throws(()=>sql(`insert into bnc_jobs(user_id,account_id,actor_id,neighbor_id,post_id,kind,state) values(${q(a.user)},${q(a.account)},${q(a.actor)},'another-neighbor','123','like','claimed');`,'service_role'),/UNSETTLED_ACCEPT/);assert.equal(call(a,'stop',{id:r.id}).state,'uncertain');
 });
 await check('ACDB06 revocation before arm releases only unarmed reservation; captcha reading disables automatic work',()=>{
  const a=fixture();permit(a);approved(a);const r=offered(a);inspect(a,r);call(a,'revoke',{device_id:a.device},null);assert.throws(()=>arm(a,r),/ACCEPT_NOT_READY/);assert.equal(call(a,'stop',{id:r.id}).state,'skipped');assert.equal(sql(`select reserved from bnc_daily where user_id=${q(a.user)}`),'0');
  const b=fixture();permit(b);const pendingRead=call(b,'offer_read',{id:randomUUID(),owner:b.actor,next_hash:'b'.repeat(64)});assert.equal(call(b,'preview',{id:pendingRead.id,nonce_hash:'b'.repeat(64),snapshot:{accountId:b.account,actorId:b.actor,checkedAt:new Date().toISOString(),restriction:'captcha'}}).blocked,true);assert.equal(sql(`select enabled from bnc_settings where user_id=${q(b.user)}`),'f');
 });

 await check('ACDB07 source expiry removes derived drafts without extending identity or deleting member directories',()=>{
  const a=fixture();permit(a);approved(a);sql(`update bnc_incoming_requests set created_at=statement_timestamp()-interval '31 days',expires_at=statement_timestamp()-interval '1 day' where user_id=${q(a.user)};`);
  const r=JSON.parse(sql("select bnc_accept_cleanup(null,'cleanup','{}');",'service_role'));assert.ok(r.expiredAcceptRecordsRemoved>=1);assert.equal(sql(`select count(*) from bnc_accept_jobs where user_id=${q(a.user)}`),'0');assert.equal(sql(`select count(*) from bnc_settings where user_id=${q(a.user)}`),'1');
 });
 await check('ACDB08 metadata confirmation and acceptance run through real API/SQL; a lost committed result never repeats a click',async()=>{
  const a=fixture();permit(a);const store={};let clicks=0;const profile={v:1,reviewed:true,reference:'synthetic-only',incomingRequestPath:'/FixtureInvitations.naver'};
  const handler=createAcceptHandler({authorize:async()=>({allowed:true,userId:a.user,deviceId:a.device}),profile:()=>({profile,read:true,execute:true}),rpc:async(u,d,op,p)=>{assert.equal(u,a.user);assert.equal(d,a.device);try{return {data:call(a,op,p),error:null};}catch(e){return {data:null,error:{message:e.message}};}}});
  const post=async(op,p)=>{const response=await handler(new Request('https://fixture.test/api/neighbors/requests/extension',{method:'POST',headers:{authorization:`Bearer ${'a'.repeat(64)}`,'content-type':'application/json'},body:JSON.stringify({operation:op,payload:p})}));const v=await response.json();assert.equal(response.status,200,JSON.stringify(v));if(op==='effect')throw Error('lost after commit');return v.data;};
  const browser={storage:{session:{get:async k=>({[k]:store[k]}),set:async v=>Object.assign(store,v),remove:async k=>delete store[k]}},tabs:{query:async()=>[{id:7,windowId:8,url:`https://admin.blog.naver.com/${a.actor}`}]},windows:{get:async()=>({focused:true,state:'normal'})},scripting:{executeScript:async options=>{const c=options.args[0];let result;if(c.scope)result={...snap(a),checkedAt:Date.now()};else if(c.operation==='apply'){assert.ok(store.acceptAttempts[c.job.id]);clicks++;result=true;}else result={...one(a),checkedAt:Date.now(),state:clicks?'mutual':'pending'};return [{frameId:1,result}];}}};
  const who=async()=>({deviceId:a.device,blogId:a.actor}),reader=createContextReader(browser,who,(op,p)=>post(({offer:'offer_read',status:'status_read'})[op]??op,op==='offer'?{request_id:p.request_id,url:p.url}:p),async()=>false,operateIncomingRequests);
  assert.equal((await reader.preview('requests')).snapshot.count,1);assert.equal((await reader.confirm()).savedCount,1);const source=call(a,'list')[0],j=call(a,'draft',{id:source.id,confirmed:true},null);call(a,'approve',{id:j.id,confirmed:true},null);
  const work=createAcceptBridge(browser,who,post);await assert.rejects(work.start(),/lost/);assert.equal(clicks,1);assert.equal((await work.status()).state,'succeeded');assert.match((await work.start()).message,/없습니다/);assert.equal(clicks,1);
 });

 await check('ACDB09 read-only reconciliation never re-clicks or refunds pending uncertainty; mutual proof settles without enabling work',()=>{
  const a=fixture();permit(a);approved(a);const r=offered(a);inspect(a,r);arm(a,r);call(a,'stop',{id:r.id});
  const check=call(a,'offer_check',{owner:a.actor,next_hash:'e'.repeat(64),execute_enabled:false});assert.equal(check.phase,'check');assert.equal(call(a,'reconcile',{id:check.id,nonce_hash:'e'.repeat(64),snapshot:one(a),execute_enabled:false}).state,'uncertain');assert.equal(sql(`select reserved from bnc_daily where user_id=${q(a.user)}`),'1');
  const confirmed=call(a,'reconcile',{id:check.id,nonce_hash:'e'.repeat(64),snapshot:{...one(a),state:'mutual'},execute_enabled:false});assert.equal(confirmed.state,'succeeded');assert.equal(sql(`select enabled from bnc_settings where user_id=${q(a.user)}`),'f');assert.equal(sql(`select reserved from bnc_daily where user_id=${q(a.user)}`),'0');assert.equal(sql(`select succeeded from bnc_daily where user_id=${q(a.user)}`),'1');assert.equal(call(a,'offer_check',{owner:a.actor,next_hash:'f'.repeat(64)}).phase,'idle');
 });
 const evidence={date:new Date().toISOString(),migration,tests,passed:tests.length,sqlCalls,isolated:true,operatingApplied:false,actualPlatformActions:0};writeFileSync(new URL('../docs/evidence/incoming-accept-database-20261030.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({passed:tests.length,sqlCalls}));
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}
