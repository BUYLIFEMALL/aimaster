import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createExtensionExecutionHandler} from '../src/lib/execution/extensionApi.ts';
import {createWorkBridge} from '../extension/work-bridge.mjs';
const migration='20261030001500_bnc_extension_execution.sql';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-extension-execution-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
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
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql','../supabase/migrations/20261029140000_bnc_engagement_inbox.sql',`../supabase/migrations/${migration}`])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 sql("update bnc_runtime set live_allowed=true,policy_reference='isolated-fixture-only';");
 const exec=(a,op,p={})=>JSON.parse(sql(`select bnc_extension_execute(${q(a.user)},${q(a.device)},${q(op)},${payload(['status','stop','cleanup'].includes(op)?p:{profile_hash:'f'.repeat(64),...p})});`,'service_role'));
 const grant=a=>JSON.parse(sql(`select bnc_extension_permission_dispatch(${q(a.user)},'grant',${payload({device_id:a.device,confirmed:true,kinds:['request','like','comment','reply']})});`,'service_role'));
 const job=a=>dispatch(a,'approve',{id:dispatch(a,'create',{account_id:a.account,neighbor_id:'fixture-neighbor',post_id:'123',kind:'like'}).id});
 const offer=(a,id=randomUUID())=>({id,target_kind:'post',owner:'fixture-neighbor',post_id:'123',kinds:['like'],next_hash:'b'.repeat(64)});
 const observation=a=>({accountId:a.account,actorId:a.actor,neighborId:'fixture-neighbor',postId:'123',checkedAt:new Date().toISOString(),restriction:'none',relationship:'mutual',liked:false,duplicate:false});
 await check('EXDB01 existing read-only device cannot offer an approved job without separate web consent',()=>{
  const a=fixture();job(a);assert.throws(()=>exec(a,'offer',offer(a)),/BNC_EXTENSION_NOT_READY/);assert.equal(sql(`select count(*) from bnc_extension_runs where user_id=${q(a.user)};`),'0');
  grant(a);assert.equal(exec(a,'offer',offer(a)).phase,'inspect');
 });
 await check('EXDB02 member RPC/direct writes are denied; only the owner can read permission/run metadata',()=>{
  const a=fixture(),b=fixture();grant(a);job(a);exec(a,'offer',offer(a));
  for(const role of ['anon','authenticated']){
   assert.throws(()=>sql(`select bnc_extension_execute(${q(a.user)},${q(a.device)},'status','{}');`,role),/permission denied/);
   assert.throws(()=>sql('update bnc_extension_permissions set revoked_at=null;',role),/permission denied/);
  }
  assert.equal(sql(`set role authenticated;set request.jwt.claim.sub=${q(b.user)};select count(*) from bnc_extension_runs;`),'0');
  assert.equal(sql(`set role authenticated;set request.jwt.claim.sub=${q(a.user)};select count(*) from bnc_extension_runs;`),'1');
 });
 await check('EXDB03 stale/cross-device/forged observation cannot claim; nonce is consumed once and status cannot recover it',()=>{
  const a=fixture(),b=fixture();grant(a);job(a);const r=exec(a,'offer',offer(a));
  assert.throws(()=>exec(b,'inspect',{id:r.id,nonce_hash:'b'.repeat(64),observation:observation(a),next_hash:'c'.repeat(64),kinds:['like']}),/BNC_NOT_FOUND/);
  assert.throws(()=>exec(a,'inspect',{id:r.id,nonce_hash:'x'.repeat(64),observation:observation(a),next_hash:'c'.repeat(64),kinds:['like']}),/BNC_STALE_RUN/);
  assert.throws(()=>exec(a,'inspect',{id:r.id,nonce_hash:'b'.repeat(64),observation:{...observation(a),actorId:'other'},next_hash:'c'.repeat(64),kinds:['like']}),/BNC_EXTENSION_OBSERVATION/);
  const p={id:r.id,nonce_hash:'b'.repeat(64),observation:observation(a),next_hash:'c'.repeat(64),kinds:['like']};assert.equal(exec(a,'inspect',p).phase,'recheck');
  assert.throws(()=>exec(a,'recheck',{...p,nonce_hash:'c'.repeat(64),profile_hash:'e'.repeat(64)}),/BNC_STALE_RUN/);
  assert.throws(()=>exec(a,'inspect',p),/BNC_STALE_RUN/);assert.throws(()=>exec(a,'offer',offer(a)),/BNC_RUN_REVIEW_REQUIRED/);
  assert.doesNotMatch(JSON.stringify(exec(a,'status')),/nonce|permit|body|profile/);
 });
 async function flow(mode='success'){
  const a=fixture(),j=job(a);grant(a);let applies=0;const session={};const calls=[];
  const token='e'.repeat(64),handler=createExtensionExecutionHandler({authorize:async h=>h===createHash('sha256').update(token).digest('hex')?{allowed:true,userId:a.user,deviceId:a.device}:{allowed:false,status:401},
   profile:()=>({profile:{v:1,reviewed:true,reference:'synthetic-only'},kinds:['like']}),rpc:async(user,device,op,p)=>{assert.equal(user,a.user);assert.equal(device,a.device);try{return {data:exec(a,op,p),error:null};}catch{return {data:null,error:{message:'private db error'}};}}});
  const post=async(op,p)=>{calls.push(op);const response=await handler(new Request('https://fixture.test/api/execution/extension',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({operation:op,payload:p})}));const v=await response.json();if(!response.ok)throw Error(v.error);if((mode==='lost-apply'&&op==='recheck')||(mode==='lost-result'&&op==='effect'))throw Error('response lost');return v.data;};
  const browser={storage:{session:{get:async k=>({[k]:session[k]}),set:async v=>Object.assign(session,v),remove:async k=>{delete session[k];}}},
   tabs:{query:async()=>[{id:7,windowId:8,url:'https://blog.naver.com/fixture-neighbor/123'}]},windows:{get:async()=>({focused:true,state:'normal'})},scripting:{executeScript:async options=>{
    const c=options.args[0];assert.equal(options.world,'ISOLATED');let result;
    const o={...observation(a),checkedAt:Date.now()};
    if(c.operation==='inspect')result=o;if(c.operation==='assert')result=true;
    if(c.operation==='apply'){assert.ok(session.workAttempts[`${a.device}:${j.id}:1`]);applies++;result=true;}
    if(c.operation==='verify')result={...o,state:'liked'};return [{frameId:1,result}];
   }}};
  const bridge=createWorkBridge(browser,async()=>({deviceId:a.device,blogId:a.actor}),post);
  let result;try{result=await bridge.start();}catch{result=null;}
  return {a,j,applies,calls,result,bridge,session};
 }
 await check('EXDB04 web API -> server nonce stages -> extension -> SQL evidence/result works without any native host',async()=>{
  const f=await flow();assert.match(f.result.message,/완료/);assert.equal(f.applies,1);assert.deepEqual(f.calls,['offer','inspect','recheck','effect']);
  assert.equal(sql(`select state from bnc_jobs where id=${q(f.j.id)};`),'succeeded');assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${q(f.j.id)};`),'1');assert.equal(sql(`select succeeded from bnc_daily where user_id=${q(f.a.user)};`),'1');
 });
 await check('EXDB05 a lost registration permission never clicks or automatically reissues the armed job',async()=>{
  const f=await flow('lost-apply');assert.equal(f.applies,0);assert.equal(sql(`select state from bnc_jobs where id=${q(f.j.id)};`),'uncertain');
  assert.equal(sql(`select reserved from bnc_daily where user_id=${q(f.a.user)};`),'1');assert.equal(f.calls.filter(x=>x==='recheck').length,1);
 });
 await check('EXDB06 lost final response preserves committed success and does not repeat the click',async()=>{
  const f=await flow('lost-result');assert.equal(f.applies,1);assert.equal(sql(`select state from bnc_jobs where id=${q(f.j.id)};`),'succeeded');assert.equal(f.calls.filter(x=>x==='effect').length,1);
  assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${q(f.j.id)};`),'1');
 });
 await check('EXDB07 revoking device execution consent blocks the next stage; stopping unarmed work releases its reservation',()=>{
  const a=fixture();job(a);grant(a);const r=exec(a,'offer',offer(a));exec(a,'inspect',{id:r.id,nonce_hash:'b'.repeat(64),observation:observation(a),next_hash:'c'.repeat(64),kinds:['like']});
  sql(`select bnc_extension_permission_dispatch(${q(a.user)},'revoke',${payload({device_id:a.device})});`,'service_role');
  assert.throws(()=>exec(a,'recheck',{id:r.id,nonce_hash:'c'.repeat(64),observation:observation(a),next_hash:'d'.repeat(64),kinds:['like']}),/BNC_EXTENSION_NOT_READY/);
  assert.equal(exec(a,'stop',{id:r.id}).phase,'done');assert.equal(sql(`select reserved from bnc_daily where user_id=${q(a.user)};`),'0');
 });
 await check('EXDB08 cleanup expires consent/run metadata without deleting approved jobs or enabling execution',()=>{
  const a=fixture();const j=job(a);grant(a);const r=exec(a,'offer',offer(a));
  sql(`update bnc_extension_permissions set expires_at=clock_timestamp()-interval '1 minute' where device_id=${q(a.device)};
   update bnc_extension_runs set expires_at=clock_timestamp()-interval '1 minute' where id=${q(r.id)};`);
  const v=JSON.parse(sql("select bnc_extension_execution_cleanup(null,'cleanup','{}');",'service_role'));assert.equal(v.expiredExtensionRecordsRemoved,2);
  assert.equal(sql(`select state from bnc_jobs where id=${q(j.id)};`),'ready');assert.equal(sql(`select count(*) from bnc_daily where user_id=${q(a.user)};`),'0');
  assert.throws(()=>sql("select bnc_extension_execution_cleanup(null,'cleanup','{}');",'authenticated'),/permission denied/);
 });
 const evidence={date:new Date().toISOString(),migration,tests,passed:tests.length,sqlCalls,isolated:true,network:'none',hostPorts:0,operatingApplied:false,actualPlatformActions:0,desktopInstaller:false,nativeMessaging:false};
 writeFileSync(new URL('../docs/evidence/web-extension-20261030.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({passed:tests.length,sqlCalls,operatingApplied:false}));
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}
