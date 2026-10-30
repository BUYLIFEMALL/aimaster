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
const migration='20261030143000_bnc_post_targets.sql';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-post-target-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
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
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261027042907_bnc_analysis.sql','../supabase/migrations/20261027141316_bnc_neighbor_import.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql','../supabase/migrations/20261029140000_bnc_engagement_inbox.sql','../supabase/migrations/20261028143000_bnc_schedule_preferences.sql','../supabase/migrations/20261029044735_bnc_schedule_cursor.sql','../supabase/migrations/20261030001500_bnc_extension_execution.sql','../supabase/migrations/20261030120000_bnc_extension_schedule.sql','../supabase/migrations/20261030133000_bnc_incoming_accept.sql','../supabase/migrations/20261030101500_bnc_message_generation.sql',`../supabase/migrations/${migration}`])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 sql("update bnc_runtime set live_allowed=true,policy_reference='isolated-fixture-only';");
 const exec=(a,op,p={})=>JSON.parse(sql(`select bnc_extension_execute(${q(a.user)},${q(a.device)},${q(op)},${payload(['status','stop','cleanup'].includes(op)?p:{profile_hash:'f'.repeat(64),...p})});`,'service_role'));
 const grant=a=>JSON.parse(sql(`select bnc_extension_permission_dispatch(${q(a.user)},'grant',${payload({device_id:a.device,confirmed:true,kinds:['request','like','comment','reply']})});`,'service_role'));
 const job=a=>dispatch(a,'approve',{id:dispatch(a,'create',{account_id:a.account,neighbor_id:'fixture-neighbor',post_id:'123',kind:'like'}).id});
 const offer=(a,id=randomUUID())=>({id,target_kind:'post',owner:'fixture-neighbor',post_id:'123',kinds:['like'],next_hash:'b'.repeat(64)});
 const observation=a=>({articleHash:'d'.repeat(64),articleCharacters:1000,accountId:a.account,actorId:a.actor,neighborId:'fixture-neighbor',postId:'123',checkedAt:new Date().toISOString(),restriction:'none',relationship:'mutual',liked:false,duplicate:false});



 const posts=(a,op,p={},device=null)=>JSON.parse(sql(`select bnc_post_dispatch(${q(a.user)},${device?q(device):'null'},${q(op)},${payload(p)});`,'service_role'));
 const directory=a=>sql(`insert into bnc_neighbor_directory(user_id,account_id,neighbor_id,relation_type,new_posts_enabled,return_visits_enabled,observed_at) values(${q(a.user)},${q(a.account)},'fixture-neighbor','mutual',true,true,clock_timestamp());`);
 const body='Complete member-provided article with full rights confirmation, never clipped.';
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const input=(a,full=false)=>({accountId:a.account,neighborId:'fixture-neighbor',rightsConfirmed:true,bodyConfirmed:full,posts:[{blogId:'fixture-neighbor',postId:'123',title:'Fixture title',body,hash:hash(['Fixture title',body]),publishedAt:null}]});
 await check('PTDB01 private planning data and RPC cannot be reached by member/anon roles',()=>{const a=fixture();for(const role of ['anon','authenticated']){assert.throws(()=>sql('select * from bnc_post_targets;',role),/permission denied/);assert.throws(()=>sql('select * from bnc_feed_checks;',role),/permission denied/);assert.throws(()=>sql(`select bnc_post_dispatch(${q(a.user)},null,'list','{}');`,role),/permission denied/);}});
 await check('PTDB02 only owned enabled neighbors can import; metadata import stores no article body or action',()=>{
  const a=fixture();assert.throws(()=>posts(a,'source',input(a)),/TARGET_DISABLED/);directory(a);assert.equal(posts(a,'import',input(a)).savedCount,1);assert.equal(sql(`select body from bnc_post_targets where user_id=${q(a.user)}`),'');assert.equal(sql(`select count(*) from bnc_jobs where user_id=${q(a.user)}`),'0');assert.throws(()=>posts(a,'material',{id:posts(a,'list')[0].id}),/TARGET_DISABLED/);
  const b=fixture();assert.throws(()=>posts(b,'import',input(a)),/TARGET_DISABLED/);
 });
 await check('PTDB03 repeat import never overwrites or extends; provided full body registers inherited AI source',()=>{
  const a=fixture();directory(a);posts(a,'import',input(a));const first=posts(a,'list')[0];assert.equal(posts(a,'import',input(a,true)).savedCount,0);assert.equal(posts(a,'list')[0].body_confirmed,false);assert.equal(posts(a,'list')[0].expires_at,first.expires_at);
  posts(a,'provide',{id:first.id,body,hash:hash(['Fixture title',body]),confirmed:true,rightsConfirmed:true});assert.equal(posts(a,'material',{id:first.id}).body,body);assert.equal(sql(`select p.expires_at=a.expires_at from bnc_post_targets p join bnc_analysis_sources a on a.user_id=p.user_id and a.blog_id=p.neighbor_id and a.post_id=p.post_id where p.id=${q(first.id)}`),'t');assert.throws(()=>posts(a,'provide',{id:first.id,body:'changed article',hash:'f'.repeat(64),confirmed:true,rightsConfirmed:true}),/TARGET_CHANGED/);
  sql(`update bnc_neighbor_directory set new_posts_enabled=false where user_id=${q(a.user)};`);assert.throws(()=>posts(a,'material',{id:first.id}),/TARGET_DISABLED/);
 });
 await check('PTDB04 full article flows into existing message preparation without refreshing original lifetime',()=>{
  const a=fixture();directory(a);posts(a,'import',input(a,true));const target=posts(a,'list')[0],profile=randomUUID(),message=randomUUID();sql(`insert into bnc_analysis_jobs(id,user_id,kind,input_hash,input,state,reviewed_result,revision,expires_at) values(${q(profile)},${q(a.user)},'profile',${q('a'.repeat(64))},${payload({ownBlogId:a.actor})},'succeeded','{"profile":{"topics":["fixture"]},"memberConfirmed":true}',1,now()+interval '720 hours');`);
  const p={id:message,kind:'comment',input_hash:'b'.repeat(64),input:{profileId:profile,profileRevision:1,accountId:a.account,provider:'anthropic',model:'claude-haiku-4-5',facts:[],post:{blogId:'fixture-neighbor',postId:'123',title:'Fixture title',body,hash:hash(['Fixture title',body])},rightsConfirmed:true,externalAiConfirmed:true}};
  sql(`select bnc_message_dispatch(${q(a.user)},'prepare',${payload(p)});`,'service_role');assert.equal(sql(`select j.expires_at=t.expires_at from bnc_message_jobs j,bnc_post_targets t where j.id=${q(message)} and t.id=${q(target.id)}`),'t');assert.equal(JSON.parse(sql(`select bnc_message_dispatch(${q(a.user)},'claim',${payload({id:message,run_hash:'e'.repeat(64)})});`,'service_role')).posts[0].body,body);
 });
 await check('PTDB05 feed rate reservation is shared per member/neighbor and does not create work or refresh source expiry',()=>{const a=fixture();directory(a);posts(a,'reserve_feed',input(a));assert.throws(()=>posts(a,'reserve_feed',input(a)),/FEED_WAIT/);const second=randomUUID();sql(`insert into member_platform_accounts(id,user_id,platform,external_id,access_token) values(${q(second)},${q(a.user)},'naver_blog','second-owner','fixture');insert into bnc_neighbor_directory(user_id,account_id,neighbor_id,relation_type,new_posts_enabled,return_visits_enabled,observed_at) values(${q(a.user)},${q(second)},'fixture-neighbor','mutual',true,false,clock_timestamp());`);assert.throws(()=>posts(a,'reserve_feed',{...input(a),accountId:second}),/FEED_WAIT/);assert.equal(sql(`select count(*) from bnc_jobs where user_id=${q(a.user)}`),'0');});
 await check('PTDB06 target discovery obeys durable due time and flags; disabling during reading rolls back claim/cursor atomically',()=>{
  const a=fixture();directory(a);job(a);grant(a);sql(`select bnc_schedule_preferences_dispatch(${q(a.user)},'get','{}');update bnc_schedule_preferences set start_minute=0,end_minute=0,interval_minutes=30 where user_id=${q(a.user)};`,'service_role');const next=()=>posts(a,'next',{kinds:['like']},a.device);assert.equal(next().phase,'waiting');assert.equal(next().reason,'not_due');sql(`update bnc_schedule_cursor set next_due_at=clock_timestamp()-interval '1 second' where user_id=${q(a.user)};`);assert.equal(next().phase,'navigate');
  assert.throws(()=>posts(a,'offer',{...offer(a),target_kind:'request'},a.device),/INVALID_INPUT/);const r=posts(a,'offer',{...offer(a),profile_hash:'f'.repeat(64)},a.device);assert.equal(r.phase,'inspect');assert.equal(sql(`select directory_required from bnc_extension_runs where id=${q(r.id)}`),'t');
  exec(a,'inspect',{id:r.id,nonce_hash:'b'.repeat(64),next_hash:'c'.repeat(64),observation:observation(a),kinds:['like']});sql(`update bnc_neighbor_directory set new_posts_enabled=false where user_id=${q(a.user)};update bnc_extension_runs set read_not_before=clock_timestamp()-interval '1 second' where id=${q(r.id)};`);
  assert.throws(()=>exec(a,'reading',{id:r.id,nonce_hash:'c'.repeat(64),next_hash:'d'.repeat(64),observation:observation(a),kinds:['like']}),/TARGET_DISABLED/);assert.equal(sql(`select state from bnc_schedule_cursor where user_id=${q(a.user)}`),'idle');assert.equal(sql(`select count(*) from bnc_daily where user_id=${q(a.user)}`),'0');exec(a,'stop',{id:r.id});assert.equal(next().reason,'no_approved_work');
 });

 await check('PTDB07 dedicated new-tab traversal -> API -> durable cursor -> one recorded action, with no feed/AI calls',async()=>{
  const a=fixture();directory(a);const j=job(a);grant(a);sql(`select bnc_schedule_preferences_dispatch(${q(a.user)},'get','{}');update bnc_schedule_preferences set start_minute=0,end_minute=0,interval_minutes=30 where user_id=${q(a.user)};`,'service_role');
  let elapsed=0,applies=0;const store={},state={tab:7,url:'https://blog-neighbor-care.buylife.xyz/neighbors'},created=[];
  const handler=createExtensionExecutionHandler({authorize:async()=>({allowed:true,userId:a.user,deviceId:a.device}),profile:()=>({profile:{v:1,reviewed:true,reference:'synthetic-only'},kinds:['like']}),rpc:async(u,d,op,p)=>{assert.equal(u,a.user);assert.equal(d,a.device);try{return {data:op==='next'?posts(a,'next',p,d):op==='traversal_offer'?posts(a,'offer',p,d):exec(a,op,p),error:null};}catch(e){return {data:null,error:{message:e.message}};}}});
  const post=async(op,p)=>{if(op==='reading')sql(`update bnc_extension_runs set read_not_before=clock_timestamp()-interval '1 second' where id=${q(p.id)};`);const r=await handler(new Request('https://fixture.test/api/execution/extension',{method:'POST',headers:{authorization:`Bearer ${'a'.repeat(64)}`,'content-type':'application/json'},body:JSON.stringify({operation:op,payload:p})}));const v=await r.json();assert.equal(r.status,200,JSON.stringify(v));return v.data;};
  const browser={storage:{session:{get:async k=>({[k]:store[k]}),set:async v=>Object.assign(store,v),remove:async k=>delete store[k]}},permissions:{contains:async()=>true},alarms:{create:async()=>{},clear:async()=>{}},tabs:{query:async()=>[{id:state.tab,windowId:8,url:state.url}],get:async()=>({id:state.tab,windowId:8,url:state.url,status:'complete'}),create:async options=>{created.push(options);state.tab=9;state.url=options.url;return {id:9,windowId:8,url:state.url};},update:async(id,options)=>{assert.equal(id,9);state.url=options.url;}},windows:{get:async()=>({id:8,focused:true,state:'normal'})},scripting:{executeScript:async options=>{const c=options.args[0],o={...observation(a),checkedAt:Date.now()};let result;if(c.operation==='inspect')result=o;if(c.operation==='assert')result=true;if(c.operation==='apply'){assert.ok(store.workAttempts[`${a.device}:${j.id}:1`]);applies++;result=true;}if(c.operation==='verify')result={...o,state:'liked'};return [{frameId:1,result}];}}};
  const who=async()=>({deviceId:a.device,blogId:a.actor}),work=createWorkBridge(browser,who,post,Date.now,async()=>false,{now:()=>elapsed,sleep:async ms=>{elapsed+=ms;}}),{createTargetTraversal,TRAVERSAL_ALARM}=await import('../extension/target-traversal.mjs'),loop=createTargetTraversal(browser,who,work,post);
  await loop.start(true);assert.equal(created.length,1);assert.equal(created[0].windowId,8);assert.equal(applies,0);sql(`update bnc_schedule_cursor set next_due_at=clock_timestamp()-interval '1 second' where user_id=${q(a.user)};`);await loop.alarm(TRAVERSAL_ALARM);assert.equal(applies,1);assert.equal(store.targetTraversal.inFlight,false);assert.equal(sql(`select state from bnc_jobs where id=${q(j.id)}`),'succeeded');assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${q(j.id)}`),'1');await loop.alarm(TRAVERSAL_ALARM);assert.equal(applies,1);
 });
 await check('PTDB08 expired planning metadata is removed without enabling execution or changing directory choices',()=>{const a=fixture();directory(a);posts(a,'import',input(a));sql(`update bnc_post_targets set created_at=statement_timestamp()-interval '31 days',expires_at=statement_timestamp()-interval '1 day' where user_id=${q(a.user)};`);const r=JSON.parse(sql("select bnc_post_cleanup(null,'cleanup','{}');",'service_role'));assert.ok(r.expiredPostTargetsRemoved>=1);assert.equal(posts(a,'list').length,0);assert.equal(sql(`select count(*) from bnc_neighbor_directory where user_id=${q(a.user)}`),'1');});

 await check('PTDB09 member execution settings and general draft review reject stale revisions and changed bodies',()=>{
  const a=fixture(),revision=Number(sql(`select revision from bnc_settings where user_id=${q(a.user)}`));
  const saved=posts(a,'configure',{request_cap:20,like_cap:100,comment_cap:30,enabled:false,expected_revision:revision,confirmed:true});assert.equal(saved.enabled,false);assert.throws(()=>posts(a,'configure',{enabled:true,expected_revision:revision,confirmed:true}),/STALE_REVISION/);
  const draft=dispatch(a,'create',{account_id:a.account,neighbor_id:'fixture-neighbor',post_id:'123',kind:'comment',body:'Member checked message'});assert.throws(()=>posts(a,'approve',{id:draft.id,expected_body:'Unseen changed message'}),/TARGET_CHANGED/);assert.equal(sql(`select state from bnc_jobs where id=${q(draft.id)}`),'draft');assert.equal(posts(a,'approve',{id:draft.id,expected_body:'Member checked message'}).state,'ready');
  sql('update bnc_runtime set live_allowed=false;');assert.throws(()=>posts(a,'configure',{enabled:true,expected_revision:saved.revision,confirmed:true}),/LIVE_DISABLED/);assert.equal(sql(`select enabled from bnc_settings where user_id=${q(a.user)}`),'f');sql('update bnc_runtime set live_allowed=true;');
 });
 const evidence={date:new Date().toISOString(),migration,tests,passed:tests.length,sqlCalls,isolated:true,operatingApplied:false,actualPlatformActions:0,aiCalls:0,actualFeedFetches:0};writeFileSync(new URL('../docs/evidence/post-targets-database-20261030.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({passed:tests.length,sqlCalls}));
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}
