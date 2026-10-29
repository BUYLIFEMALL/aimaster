import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {runTicketedWork} from '../src/lib/execution/trustedHost.ts';
import {issueWorkerTicket} from '../src/lib/execution/workerTicket.ts';
const migration='20261029140000_bnc_engagement_inbox.sql';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-engagement-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
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
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql',`../supabase/migrations/${migration}`])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 sql("update bnc_runtime set live_allowed=true,policy_reference='isolated-fixture-only';");
 const a=fixture(),other=fixture();let sourceId,reply;
 await check('EDB01 source and operations are owner-scoped; members cannot intake or write directly',()=>{
  sourceId=source(a);assert.equal(inbox(a,'list').length,1);assert.equal(inbox(other,'list').length,0);
  assert.throws(()=>inbox(other,'reply',{id:sourceId,body:'fixture'}),/BNC_NOT_FOUND/);
  for(const role of ['anon','authenticated']){
   assert.throws(()=>sql(inboxSql(a,'list'),role),/permission denied/);
   assert.throws(()=>sql('update bnc_engagement_inbox set neighbor_id=neighbor_id;',role),/permission denied/);
  }
  assert.equal(sql(`set role authenticated;set request.jwt.claim.sub=${q(other.user)};select count(*) from bnc_engagement_inbox;`),'0');
  assert.equal(sql(`set role authenticated;set request.jwt.claim.sub=${q(a.user)};select count(*) from bnc_engagement_inbox;`),'1');
  assert.equal(sql("select count(*) from pg_proc where proname in ('bnc_engagement_dispatch','bnc_engagement_cleanup','guard_reply_target') and prosecdef;"),'0');
 });
 await check('EDB02 reply draft pins own post, original comment and source deadline; it does not reserve or enable execution',()=>{
  reply=inbox(a,'reply',{id:sourceId,body:'fixture reply'});assert.equal(reply.kind,'reply');assert.equal(reply.post_id,'123');assert.equal(reply.neighbor_id,'fixture-neighbor');
  assert.equal(reply.parent_comment_id,`comment-${sourceId}`);assert.equal(reply.state,'draft');assert.equal(reply.reserved,false);
  assert.equal(sql(`select expires_at=(select expires_at from bnc_engagement_inbox where id=${q(sourceId)}) from bnc_jobs where id=${q(reply.id)};`),'t');
  assert.equal(sql(`select count(*) from bnc_daily where user_id=${q(a.user)};`),'0');
  assert.equal(inbox(a,'review',{id:reply.id}).body,'fixture reply');assert.throws(()=>inbox(other,'review',{id:reply.id}),/BNC_NOT_FOUND/);
 });
 await check('EDB03 repeated/concurrent draft creation cannot duplicate a reply or overwrite the previous reviewed sentence',async()=>{
  assert.throws(()=>inbox(a,'reply',{id:sourceId,body:'changed'}),/BNC_ENGAGEMENT_EXISTS/);
  assert.throws(()=>sql(`update bnc_engagement_inbox set observed_at=observed_at+interval '1 minute',expires_at=expires_at+interval '1 minute' where id=${q(sourceId)};`),/BNC_SOURCE_CHANGED/);
  const id=source(other);const results=await Promise.allSettled([1,2].map(()=>asyncSql(`set role service_role;${inboxSql(other,'reply',{id,body:'concurrent fixture'})}`)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(sql(`select count(*) from bnc_jobs where user_id=${q(other.user)};`),'1');
 });
 await check('EDB04 return visit uses the confirmed neighbor post; missing target cannot create a draft',()=>{
  const visit=inbox(a,'return_visit',{id:sourceId,body:'fixture visit'});assert.equal(visit.kind,'comment');assert.equal(visit.post_id,'456');assert.equal(visit.parent_comment_id,null);
  const id=source(a,null);assert.throws(()=>inbox(a,'return_visit',{id,body:'fixture'}),/BNC_RETURN_POST_REQUIRED/);
  assert.throws(()=>inbox(a,'reply',{id,body:'fixture',parent_comment_id:'forged'}),/BNC_INVALID_INPUT/);
 });
 await check('EDB05 raw reply cannot be approved without a parent; pinned target cannot change after binding',()=>{
  const raw=dispatch(a,'create',{account_id:a.account,neighbor_id:'other-neighbor',post_id:'987',kind:'reply',body:'unbound fixture'});
  assert.throws(()=>dispatch(a,'approve',{id:raw.id}),/BNC_REPLY_TARGET/);
  assert.throws(()=>sql(`update bnc_jobs set parent_comment_id='changed' where id=${q(reply.id)};`),/BNC_REPLY_TARGET_CHANGED/);
  assert.throws(()=>sql(`update bnc_jobs set post_id='999' where id=${q(reply.id)};`),/BNC_REPLY_TARGET_CHANGED/);
 });
 await check('EDB06 signed reply -> exact parent verification -> atomic proof and shared comment budget, without replay',async()=>{
  dispatch(a,'approve',{id:reply.id});const secret='fixture-reply-worker-secret-32bytes';let effects=0;
  const ticket=issueWorkerTicket({memberId:a.user,jobId:reply.id,accountId:a.account,deviceId:a.device,actorId:a.actor,bodyHash:createHash('sha256').update(reply.body).digest('hex'),approvalRevision:2,generation:1},secret);
  const context=()=>({accountId:a.account,actorId:a.actor,neighborId:'fixture-neighbor',postId:'123',checkedAt:Date.now(),postOwnerId:a.actor,parentCommentId:reply.parent_comment_id,parentAuthorId:'fixture-neighbor'});
  const store={member:async id=>({allowed:id===a.user,userId:id}),connected:async()=>true,permitted:async()=>true,
   load:async(user,id)=>JSON.parse(sql(`select to_jsonb(j) from bnc_jobs j where user_id=${q(user)} and id=${q(id)};`,'service_role')),
   rpc:async(user,op,p)=>dispatch({user},op,p),result:async(user,p)=>JSON.parse(sql(`select bnc_execution_result_dispatch(${q(user)},'result',${payload(p)});`,'service_role'))};
  const adapter={inspect:async()=>({...context(),restriction:'none',relationship:'mutual',liked:false,duplicate:false}),assertCurrent:async()=>true,
   apply:async()=>{effects++;},verify:async()=>({...context(),state:'commented',bodyHash:createHash('sha256').update(reply.body).digest('hex'),effectId:'fixture-reply-1'})};
  assert.equal((await runTicketedWork(ticket,{secret:()=>secret,store,adapter})).status,'succeeded');
  assert.equal(sql(`select proof->>'parent_comment_id' from bnc_execution_evidence where job_id=${q(reply.id)};`),reply.parent_comment_id);
  assert.equal(sql(`select succeeded from bnc_daily where user_id=${q(a.user)} and kind='comment';`),'1');
  assert.equal((await runTicketedWork(ticket,{secret:()=>secret,store,adapter})).status,'blocked');assert.equal(effects,1);
  const visit=inbox(a,'list').find(r=>r.id===sourceId).visit_job_id;dispatch(a,'approve',{id:visit});
  assert.throws(()=>dispatch(a,'claim',{id:visit,device_id:a.device}),/BNC_NEIGHBOR_CAP/);
 });
 await check('EDB07 forged parent proof cannot commit evidence or success counters',()=>{
  const b=fixture(),id=source(b),j=inbox(b,'reply',{id,body:'fixture forged proof'});dispatch(b,'approve',{id:j.id});
  dispatch(b,'observe',{id:j.id,relationship:'mutual',liked:false});const claim=dispatch(b,'claim',{id:j.id,device_id:b.device});dispatch(b,'arm',{id:j.id,device_id:b.device,generation:claim.generation});
  const p={id:j.id,device_id:b.device,generation:claim.generation,outcome:'success',verified:true,attempted_at:new Date().toISOString(),evidence:{account_id:b.account,actor_id:b.actor,neighbor_id:'fixture-neighbor',post_id:'123',kind:'reply',state:'commented',effect_id:'reply-fake',body_hash:createHash('sha256').update(j.body).digest('hex'),parent_comment_id:'wrong',observed_at:new Date().toISOString()}};
  assert.throws(()=>sql(`select bnc_execution_result_dispatch(${q(b.user)},'result',${payload(p)});`,'service_role'),/BNC_EVIDENCE_CONTEXT/);
  assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${q(j.id)};`),'0');assert.equal(sql(`select succeeded from bnc_daily where user_id=${q(b.user)};`),'0');
 });
 await check('EDB08 disconnected account blocks drafting; expiry hides sources and cleanup deletes only expired metadata',()=>{
  const b=fixture(),id=source(b);sql(`update member_platform_accounts set needs_reconnect=true where id=${q(b.account)};`);
  assert.throws(()=>inbox(b,'reply',{id,body:'fixture'}),/BNC_ACCOUNT_REQUIRED/);
  const expired=randomUUID();sql(`insert into bnc_engagement_inbox(id,user_id,account_id,actor_id,neighbor_id,own_post_id,comment_id,created_at,observed_at,expires_at)
   values(${q(expired)},${q(b.user)},${q(b.account)},${q(b.actor)},'fixture-neighbor','123','expired-fixture',statement_timestamp()-interval '31 days',statement_timestamp()-interval '31 days',statement_timestamp()-interval '1 day');`);
  assert.equal(inbox(b,'list').length,1);assert.throws(()=>inbox(b,'reply',{id:expired,body:'fixture'}),/BNC_EXPIRED/);
  const result=JSON.parse(sql("select bnc_engagement_cleanup(null,'cleanup','{}');",'service_role'));assert.equal(result.expiredEngagementsRemoved,1);
  assert.equal(inbox(a,'list').length,2);assert.equal(sql(`select state from bnc_jobs where id=${q(reply.id)};`),'succeeded');
 });
 const evidence={date:new Date().toISOString(),migration,tests,passed:tests.length,sqlCalls,isolated:true,network:'none',hostPorts:0,operatingApplied:false,actualPlatformActions:0};
 writeFileSync(new URL('../docs/evidence/engagement-20261029.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({passed:tests.length,sqlCalls,operatingApplied:false}));
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}

