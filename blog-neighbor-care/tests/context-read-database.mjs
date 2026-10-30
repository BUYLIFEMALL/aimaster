import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createExtensionContextHandler} from '../src/lib/neighbors/contextApi.ts';
import {createContextReader} from '../extension/context-bridge.mjs';
const migration='20261030094500_bnc_extension_context_reads.sql';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-context-read-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
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
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql','../supabase/migrations/20261029140000_bnc_engagement_inbox.sql','../supabase/migrations/20261030001500_bnc_extension_execution.sql',`../supabase/migrations/${migration}`])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 sql("update bnc_runtime set live_allowed=true,policy_reference='isolated-fixture-only';");
 const read=(a,op,p={})=>JSON.parse(sql(`select bnc_extension_context_dispatch(${q(a.user)},${q(a.device)},${q(op)},${payload(['status','cancel','cleanup'].includes(op)?p:{allowed_reads:['relationship','incoming','return_post'],profile_hash:'f'.repeat(64),...p})});`,'service_role'));
 const grant=a=>sql(`select bnc_extension_permission_dispatch(${q(a.user)},'grant',${payload({device_id:a.device,confirmed:true,kinds:[],reads:['relationship','incoming','return_post']})});`,'service_role');
 const offer=(kind,owner,post_id='')=>({id:randomUUID(),kind,owner,post_id,next_hash:'b'.repeat(64)});
 function requested(a){
  let j=dispatch(a,'create',{account_id:a.account,neighbor_id:'fixture-neighbor',kind:'request',body:'fixture request'});j=dispatch(a,'approve',{id:j.id});
  dispatch(a,'observe',{id:j.id,relationship:'unknown',liked:null});j=dispatch(a,'claim',{id:j.id,device_id:a.device});dispatch(a,'arm',{id:j.id,device_id:a.device,generation:j.generation});
  const time=new Date().toISOString(),e={account_id:a.account,actor_id:a.actor,neighbor_id:'fixture-neighbor',post_id:'',kind:'request',state:'pending',effect_id:null,body_hash:null,observed_at:time};
  return JSON.parse(sql(`select bnc_execution_result_dispatch(${q(a.user)},'result',${payload({id:j.id,device_id:a.device,generation:j.generation,outcome:'success',verified:true,attempted_at:time,evidence:e})});`,'service_role'));
 }
 async function flow(a,kind,{count=1,changed=false,restriction='none'}={}){
  const token='e'.repeat(64),calls=[],s={reads:0};
  const handler=createExtensionContextHandler({authorize:async h=>h===createHash('sha256').update(token).digest('hex')?{allowed:true,userId:a.user,deviceId:a.device}:{allowed:false,status:401},
   profile:()=>({profile:{v:1,reviewed:true,reference:'synthetic-only'},reads:['relationship','incoming','return_post']}),
   rpc:async(user,device,op,p)=>{assert.equal(user,a.user);assert.equal(device,a.device);try{return {data:read(a,op,p),error:null};}catch(error){return {data:null,error:{message:error.message}};}}});
  const post=async(op,p)=>{calls.push(op);const r=await handler(new Request('https://fixture.test/api/neighbors/context/extension',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({operation:op,payload:p})}));const v=await r.json();if(!r.ok)throw Error(v.error);return v.data;};
  const url=kind==='relationship'?'https://blog.naver.com/fixture-neighbor':kind==='incoming'?`https://blog.naver.com/${a.actor}/123`:'https://blog.naver.com/fixture-neighbor/456';
  const browser={tabs:{query:async()=>[{id:7,windowId:8,url}]},windows:{get:async()=>({focused:true,state:'normal'})},scripting:{executeScript:async opts=>{
   s.reads++;assert.equal(opts.world,'ISOLATED');const base={accountId:a.account,actorId:a.actor,checkedAt:Date.now(),restriction};let result;
   if(kind==='relationship')result={...base,neighborId:'fixture-neighbor',relationship:changed&&s.reads>1?'removed':'mutual'};
   if(kind==='incoming')result={...base,ownPostId:'123',complete:true,count,comments:Array.from({length:count},(_,i)=>({commentId:`original-${i}`,neighborId:'fixture-neighbor',parentIsTopLevel:true,alreadyReplied:false}))};
   if(kind==='return_post')result={...base,neighborId:'fixture-neighbor',postId:'456'};
   return [{frameId:1,result}];
  }}};
  const bridge=createContextReader(browser,async()=>({deviceId:a.device,blogId:a.actor}),post);const preview=await bridge.preview(kind);
  return {preview,bridge,calls,s};
 }
 await check('CRDB01 read consent is separate from execution consent; no permission or missing request receipt blocks offer',()=>{
  const a=fixture();requested(a);assert.throws(()=>read(a,'offer',offer('relationship','fixture-neighbor')),/BNC_READ_NOT_PERMITTED/);
  grant(a);assert.equal(read(a,'offer',offer('relationship','fixture-neighbor')).phase,'read');
  const b=fixture();grant(b);assert.throws(()=>read(b,'offer',offer('relationship','fixture-neighbor')),/BNC_REQUEST_RECEIPT_REQUIRED/);
  assert.equal(sql(`select cardinality(kinds) from bnc_extension_permissions where device_id=${q(a.device)};`),'0');
 });
 await check('CRDB02 relationship preview and second confirmation update saved status with no claims/counters and write gate off',async()=>{
  const a=fixture(),j=requested(a);grant(a);const before=sql(`select to_jsonb(d) from bnc_daily d where user_id=${q(a.user)};`);
  sql('update bnc_runtime set live_allowed=false;');const f=await flow(a,'relationship');assert.equal(f.preview.snapshot.relationship,'mutual');
  assert.equal(sql(`select state from bnc_neighbors where user_id=${q(a.user)};`),'pending');
  assert.equal((await f.bridge.confirm()).savedCount,1);assert.equal(f.s.reads,2);assert.equal(sql(`select state from bnc_neighbors where user_id=${q(a.user)};`),'mutual');
  assert.equal(sql(`select to_jsonb(d) from bnc_daily d where user_id=${q(a.user)};`),before);assert.equal(sql(`select state from bnc_jobs where id=${q(j.id)};`),'succeeded');
  assert.equal(sql('select live_allowed from bnc_runtime;'),'f');sql('update bnc_runtime set live_allowed=true;');
 });
 let owner,sourceId,sourceExpiry;
 await check('CRDB03 incoming comments preview stores no raw metadata; confirmed IDs create inbox and rereading preserves its original deadline',async()=>{
  owner=fixture();grant(owner);const f=await flow(owner,'incoming');assert.equal(sql(`select count(*) from bnc_engagement_inbox where user_id=${q(owner.user)};`),'0');
  const result=await f.bridge.confirm();assert.equal(result.savedCount,1);assert.equal(result.externalActions,0);
  const row=JSON.parse(sql(`select to_jsonb(i) from bnc_engagement_inbox i where user_id=${q(owner.user)};`));sourceId=row.id;sourceExpiry=row.expires_at;
  const again=await flow(owner,'incoming');assert.equal((await again.bridge.confirm()).savedCount,0);
  assert.equal(sql(`select expires_at::text from bnc_engagement_inbox where id=${q(sourceId)};`),sql(`select ${q(sourceExpiry)}::timestamptz::text;`));
  assert.equal(sql(`select count(*) from bnc_jobs where user_id=${q(owner.user)};`),'0');
 });
 await check('CRDB04 confirmed neighbor post supplies the existing inbox and return-visit draft without mutating source identity/deadline',async()=>{
  const f=await flow(owner,'return_post');assert.equal(f.preview.source.commentId,'original-0');assert.equal((await f.bridge.confirm()).savedCount,1);
  const rows=JSON.parse(sql(`select bnc_engagement_dispatch(${q(owner.user)},'list','{}');`,'service_role'));assert.equal(rows[0].return_post_id,'456');
  const j=JSON.parse(sql(`select bnc_engagement_dispatch(${q(owner.user)},'return_visit',${payload({id:sourceId,body:'fixture return visit'})});`,'service_role'));
  assert.equal(j.post_id,'456');assert.equal(j.kind,'comment');assert.equal(Date.parse(j.expires_at),Date.parse(sourceExpiry));
  assert.equal(sql(`select return_post_id is null from bnc_engagement_inbox where id=${q(sourceId)};`),'t');
 });
 await check('CRDB05 changed second observation cannot overwrite relationship; unknown/partial snapshots cannot fabricate empty results',async()=>{
  const a=fixture();requested(a);grant(a);const f=await flow(a,'relationship',{changed:true});await assert.rejects(f.bridge.confirm());assert.equal(sql(`select state from bnc_neighbors where user_id=${q(a.user)};`),'pending');
  const b=fixture();grant(b);const r=read(b,'offer',offer('incoming',b.actor,'123'));
  const snap={accountId:b.account,actorId:b.actor,checkedAt:new Date().toISOString(),restriction:'none',ownPostId:'123',complete:false,count:0,comments:[]};
  assert.throws(()=>read(b,'preview',{id:r.id,nonce_hash:'b'.repeat(64),next_hash:'c'.repeat(64),snapshot:snap}),/BNC_COMMENTS_INCOMPLETE/);
  assert.equal(sql(`select count(*) from bnc_engagement_inbox where user_id=${q(b.user)};`),'0');
 });
 await check('CRDB06 complete zero-count view is explicitly scoped to current post, and captcha stops execution without saving metadata',async()=>{
  const a=fixture();grant(a);const f=await flow(a,'incoming',{count:0});const r=await f.bridge.confirm();assert.equal(r.savedCount,0);assert.equal(r.coverage,'current-post-complete');
  const b=fixture();grant(b);await assert.rejects(flow(b,'incoming',{restriction:'captcha'}));assert.equal(sql(`select enabled from bnc_settings where user_id=${q(b.user)};`),'f');assert.equal(sql(`select count(*) from bnc_engagement_inbox where user_id=${q(b.user)};`),'0');
 });
 await check('CRDB07 member direct writes/RPC denied, cross-device metadata absent, duplicate nonce and wrong profile rejected',()=>{
  const a=fixture(),b=fixture();grant(a);const r=read(a,'offer',offer('incoming',a.actor,'123'));
  assert.throws(()=>read(b,'cancel',{id:r.id}),/BNC_NOT_FOUND/);
  for(const role of ['anon','authenticated'])assert.throws(()=>sql(`select bnc_extension_context_dispatch(${q(a.user)},${q(a.device)},'status','{}');`,role),/permission denied/);
  assert.equal(sql(`set role authenticated;set request.jwt.claim.sub=${q(b.user)};select count(*) from bnc_extension_context_reads;`),'0');
  const snap={accountId:a.account,actorId:a.actor,checkedAt:new Date().toISOString(),restriction:'none',ownPostId:'123',complete:true,count:0,comments:[]};
  assert.throws(()=>read(a,'preview',{id:r.id,nonce_hash:'b'.repeat(64),next_hash:'c'.repeat(64),profile_hash:'e'.repeat(64),snapshot:snap}),/BNC_STALE_READ/);
  const p={id:r.id,nonce_hash:'b'.repeat(64),next_hash:'c'.repeat(64),snapshot:snap};assert.equal(read(a,'preview',p).phase,'preview');assert.throws(()=>read(a,'preview',p),/BNC_STALE_READ/);
 });
 await check('CRDB08 receipt deletion or device/account relinking during preview invalidates confirmation; cancellation remains possible',async()=>{
  const a=fixture(),j=requested(a);grant(a);const f=await flow(a,'relationship');sql(`delete from bnc_execution_evidence where job_id=${q(j.id)};`);await assert.rejects(f.bridge.confirm());assert.equal(sql(`select state from bnc_neighbors where user_id=${q(a.user)};`),'pending');
  const b=fixture();grant(b);const g=await flow(b,'incoming');
  const otherAccount=randomUUID();sql(`insert into member_platform_accounts(id,user_id,platform,external_id,access_token) values(${q(otherAccount)},${q(b.user)},'naver_blog','second-blog','fixture');update bnc_reader_devices set account_id=${q(otherAccount)},blog_id='second-blog' where id=${q(b.device)};`);
  await assert.rejects(g.bridge.confirm());assert.equal(sql(`select count(*) from bnc_engagement_inbox where user_id=${q(b.user)};`),'0');assert.equal(read(b,'status').phase,'idle');
 });
 await check('CRDB09 read-only consent cannot execute an approved action, and cleanup expires read metadata without deleting drafts',()=>{
  const a=fixture();grant(a);const j=dispatch(a,'approve',{id:dispatch(a,'create',{account_id:a.account,neighbor_id:'fixture-neighbor',post_id:'123',kind:'like'}).id});
  assert.throws(()=>sql(`select bnc_extension_execute(${q(a.user)},${q(a.device)},'offer',${payload({id:randomUUID(),target_kind:'post',owner:'fixture-neighbor',post_id:'123',kinds:['like'],next_hash:'b'.repeat(64),profile_hash:'f'.repeat(64)})});`,'service_role'),/BNC_EXTENSION_NOT_READY/);
  assert.equal(sql(`select state from bnc_jobs where id=${q(j.id)};`),'ready');assert.equal(sql(`select count(*) from bnc_daily where user_id=${q(a.user)};`),'0');
  sql(`update bnc_extension_context_reads set expires_at=clock_timestamp()-interval '1 minute' where id=(select id from bnc_extension_context_reads where user_id=${q(owner.user)} limit 1);
   update bnc_return_visit_posts set expires_at=clock_timestamp()-interval '1 minute' where source_id=${q(sourceId)};`);
  const result=JSON.parse(sql("select bnc_extension_context_cleanup(null,'cleanup','{}');",'service_role'));assert.equal(result.expiredContextRecordsRemoved,2);
  assert.equal(sql(`select count(*) from bnc_jobs where user_id=${q(owner.user)};`),'1');
 });
 const evidence={date:new Date().toISOString(),migration,tests,passed:tests.length,sqlCalls,isolated:true,network:'none',hostPorts:0,operatingApplied:false,actualPlatformActions:0};
 writeFileSync(new URL('../docs/evidence/context-reads-20261030.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({passed:tests.length,sqlCalls,operatingApplied:false}));
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}
