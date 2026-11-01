import {createMonitorHandler,monitorQuotes} from '../src/lib/neighbors/monitor.ts';
import {createMonitorCronHandler} from '../src/lib/neighbors/monitorCron.ts';
import {hashMonitorToken} from '../src/lib/neighbors/cronJob.ts';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
// Isolated fixture database only: no network, no host port, fixture members and keys. Feed and AI are mocks.
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-monitor-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
assert.match(container,/^[a-f0-9]{64}$/);
const args=['exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres'];
const q=v=>`'${String(v).replaceAll("'","''")}'`,payload=v=>`${q(JSON.stringify(v))}::jsonb`;
let sqlCalls=0,tests=0;
const sql=(text,role='postgres')=>{sqlCalls++;return execFileSync('docker',args,{input:(role==='postgres'?'':`set role ${role};`)+text,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();};
const asyncSql=text=>new Promise((resolve,reject)=>{sqlCalls++;const p=spawn('docker',args,{windowsHide:true});let out='',err='';p.stdout.on('data',v=>out+=v);p.stderr.on('data',v=>err+=v);p.on('error',reject);p.on('close',c=>c?reject(Error(err)):resolve(out.trim()));p.stdin.end(text);});
const ok=name=>{tests++;console.log(`ok ${tests} - ${name}`);};
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const names={monitor:'bnc_monitor_dispatch',post:'bnc_post_dispatch',message:'bnc_message_dispatch',analysis:'bnc_analysis_dispatch',scheduler:'bnc_monitor_scheduler_dispatch'};
const call=(user,ns,op,p={})=>{const u=user?q(user):'null';const text=ns==='post'?`select bnc_post_dispatch(${u},null,${q(op)},${payload(p)});`:`select ${names[ns]}(${u},${q(op)},${payload(p)});`;const out=sql(text,'service_role');return out?JSON.parse(out):null;};
const mon=(a,op,p={})=>call(a.user,'monitor',op,p);
const krBody='비를 막는 방수 덮개와 가벼운 접이식 의자를 준비하는 과정에 대한 전체 글입니다.';
const body='Complete member-provided article about waterproof covers and folding chairs, with full rights confirmation.';
try{
 let ready=false;for(let i=0;i<100;i++){try{assert.equal(execFileSync('docker',['exec',container,'cat','/proc/1/comm'],{encoding:'utf8',windowsHide:true}).trim(),'postgres');sql('select 1;');ready=true;break;}catch{await new Promise(r=>setTimeout(r,150));}}assert.ok(ready);
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261027042907_bnc_analysis.sql','../supabase/migrations/20261027141316_bnc_neighbor_import.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql','../supabase/migrations/20261029140000_bnc_engagement_inbox.sql','../supabase/migrations/20261028143000_bnc_schedule_preferences.sql','../supabase/migrations/20261029044735_bnc_schedule_cursor.sql','../supabase/migrations/20261030001500_bnc_extension_execution.sql','../supabase/migrations/20261030120000_bnc_extension_schedule.sql','../supabase/migrations/20261030133000_bnc_incoming_accept.sql','../supabase/migrations/20261030101500_bnc_message_generation.sql','../supabase/migrations/20261030143000_bnc_post_targets.sql','../supabase/migrations/20261030150000_bnc_accept_schedule.sql','../supabase/migrations/20261030160000_bnc_monitor.sql'])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 ok('migration 10 runs after the nine pending migrations');
 const fixture=(neighbors=['alpha','beta','gamma'])=>{
  const a={user:randomUUID(),account:randomUUID(),profile:randomUUID(),own:`own-${randomUUID().slice(0,8)}`,neighbors};
  sql(`insert into auth.users values(${q(a.user)});insert into member_platform_accounts(id,user_id,platform,external_id,access_token) values(${q(a.account)},${q(a.user)},'naver_blog',${q(a.own)},'fixture-only');
  insert into bnc_settings(user_id) values(${q(a.user)});
  insert into bnc_analysis_jobs(id,user_id,kind,input_hash,input,state,reviewed_result,revision,expires_at) values(${q(a.profile)},${q(a.user)},'profile',${q('c'.repeat(64))},${payload({ownBlogId:a.own})},'succeeded','{"profile":{"topics":["fixture"]},"memberConfirmed":true}',1,clock_timestamp()+interval '20 days');
  ${neighbors.map(n=>`insert into bnc_neighbor_directory(user_id,account_id,neighbor_id,relation_type,new_posts_enabled,return_visits_enabled,observed_at) values(${q(a.user)},${q(a.account)},${q(n)},'mutual',true,true,clock_timestamp());`).join('')}`);
  return a;
 };
 const prices=JSON.stringify([{provider:'anthropic',model:'claude-haiku-4-5',inputUsdPerMillion:1,outputUsdPerMillion:5,validUntil:'2099-01-01T00:00:00Z',reference:'https://fixture.test/reviewed-price'}]);
 const quote=monitorQuotes(prices)[0];
 const startFeed=(a,extra={})=>mon(a,'start',{accountId:a.account,neighbors:a.neighbors,aiEnabled:false,expectedRevision:0,feedConsent:true,confirmed:true,budgetMicros:0,maxAi:0,background:true,...extra});
 const startAi=(a,extra={})=>startFeed(a,{aiEnabled:true,aiConsent:true,profileId:a.profile,profileRevision:1,provider:'anthropic',model:'claude-haiku-4-5',quoteHash:quote.hash,budgetMicros:2000000,maxAi:2,background:false,...extra});
 const addTarget=(a,neighbor,post)=>{const title='Camping';call(a.user,'post','import',{accountId:a.account,neighborId:neighbor,rightsConfirmed:true,bodyConfirmed:false,posts:[{blogId:neighbor,postId:post,title,body:'',hash:sha([title,'']),publishedAt:null}]});const id=sql(`select id from bnc_post_targets where user_id=${q(a.user)} and neighbor_id=${q(neighbor)} and post_id=${q(post)};`);return {id,title};};
 const confirm=(a,t)=>call(a.user,'post','provide',{id:t.id,confirmed:true,rightsConfirmed:true,body,hash:sha([t.title,body])});

 // Permissions.
 for(const role of ['anon','authenticated']){
  for(const t of ['bnc_monitors','bnc_monitor_attempts','bnc_monitor_scheduler'])assert.throws(()=>sql(`select * from ${t};`,role),/permission denied/);
  for(const f of ['bnc_monitor_dispatch','bnc_monitor_scheduler_dispatch'])assert.throws(()=>sql(`select ${f}(null,'status','{}'::jsonb);`,role),/permission denied/);
 }
 ok('anon and authenticated cannot read tables or call the functions');

 const a=fixture(),other=fixture();
 assert.equal(mon(a,'status').monitor,null);assert.equal(mon(a,'status').awaitingBody,0);
 const blocked=fixture(['alpha']);sql(`update member_platform_accounts set needs_reconnect=true where id=${q(blocked.account)};`);assert.throws(()=>startFeed(blocked),/ACCOUNT_REQUIRED/);
 assert.throws(()=>startFeed(a,{feedConsent:false}),/MONITOR_CHANGED/);assert.throws(()=>startFeed(a,{accountId:other.account}),/ACCOUNT_REQUIRED/);assert.throws(()=>startFeed(a,{neighbors:['stranger']}),/TARGET_DISABLED/);
 assert.throws(()=>startAi(a,{aiConsent:false}),/INVALID_INPUT/);assert.throws(()=>startAi(a,{profileId:other.profile}),/MESSAGE_PROFILE/);
 ok('account, neighbor, consent and profile gates; empty status has no monitor');

 const s=startFeed(a);assert.equal(s.externalActions,0);let st=mon(a,'status').monitor;
 assert.equal(st.state,'active');assert.equal(st.feed_count,0);assert.equal(st.ai_count,0);assert.equal(st.background,true);
 const days=Number(sql(`select extract(epoch from expires_at-created_at)/86400 from bnc_monitors where user_id=${q(a.user)};`));assert.ok(days>6.99&&days<=7);
 assert.throws(()=>sql(`update bnc_monitors set expires_at=created_at+interval '8 days' where user_id=${q(a.user)};`),/check/);
 assert.throws(()=>mon(other,'claim',{sessionId:s.sessionId}),/MONITOR_CHANGED/);assert.throws(()=>startFeed(a,{expectedRevision:1}),/MONITOR_CHANGED/);
 ok('starting makes no call, lasts at most 7 days, and another member cannot touch the session');

 // Feed scheduling.
 let w=mon(a,'claim',{sessionId:s.sessionId,feedOnly:true});assert.equal(w.phase,'feed');assert.equal(w.neighbor_id,'alpha');
 assert.equal(mon(a,'claim',{sessionId:s.sessionId,feedOnly:true}).reason,'busy');
 const bind=x=>({sessionId:x.id,workId:x.work_id,generation:x.generation});
 mon(a,'feed_complete',{...bind(w),posts:[{blogId:'alpha',postId:'101',title:'New',body:'',hash:sha(['New','']),publishedAt:null}]});
 assert.equal(sql(`select body||'|'||body_confirmed from bnc_post_targets where user_id=${q(a.user)} and post_id='101';`),'|false');
 w=mon(a,'claim',{sessionId:s.sessionId,feedOnly:true});assert.equal(w.neighbor_id,'beta');mon(a,'fail',bind(w));
 st=mon(a,'status').monitor;assert.equal(st.state,'active');assert.equal(st.feed_failures,1);
 w=mon(a,'claim',{sessionId:s.sessionId,feedOnly:true});assert.equal(w.neighbor_id,'gamma');
 sql(`update bnc_monitors set lease_until=clock_timestamp()-interval '1 second' where user_id=${q(a.user)};`);
 st=mon(a,'status').monitor;assert.equal(st.state,'active');assert.equal(st.work_id,null);assert.equal(st.feed_failures,2);
 assert.equal(mon(a,'claim',{sessionId:s.sessionId,feedOnly:true}).reason,'waiting');
 const shared=startFeed(fixture(['alpha']));assert.ok(shared.sessionId);
 ok('15-minute schedule per neighbor; failed or abandoned read skips only that neighbor; metadata only');

 // Forty-thousand ceiling and a stale stop.
 sql(`update bnc_monitors set feed_count=40000 where user_id=${q(a.user)};update bnc_feed_checks set checked_at=clock_timestamp()-interval '1 hour' where user_id=${q(a.user)};`);
 assert.equal(mon(a,'claim',{sessionId:s.sessionId}).reason,'waiting');
 sql(`update bnc_monitors set feed_count=3 where user_id=${q(a.user)};`);
 w=mon(a,'claim',{sessionId:s.sessionId,feedOnly:true});mon(a,'stop',{sessionId:s.sessionId});
 st=mon(a,'status').monitor;assert.equal(st.state,'off');assert.equal(st.work_id,null);assert.throws(()=>mon(a,'feed_complete',{...bind(w),posts:[]}),/STALE_RUN/);
 ok('read ceiling stops reads, stop during a read ends the session and rejects the late result');

 // Concurrent claims.
 const c=fixture(['alpha','beta']);const cs=startFeed(c);
 const claims=await Promise.all([1,2,3].map(()=>asyncSql(`set role service_role;select bnc_monitor_dispatch(${q(c.user)},'claim',${payload({sessionId:cs.sessionId,feedOnly:true})});`)));
 assert.equal(claims.map(v=>JSON.parse(v.split('\n').pop())).filter(v=>v.phase==='feed').length,1);
 ok('three simultaneous claims yield one piece of work');

 // AI selection and budget.
 const ai=fixture(['alpha','beta']);const unconfirmed=addTarget(ai,'alpha','201');const as=startAi(ai);
 sql(`update bnc_feed_checks set checked_at=clock_timestamp() where false;insert into bnc_feed_checks(user_id,neighbor_id) values(${q(ai.user)},'alpha'),(${q(ai.user)},'beta') on conflict(user_id,neighbor_id) do update set checked_at=clock_timestamp();`);
 assert.equal(mon(ai,'claim',{sessionId:as.sessionId}).reason,'waiting');assert.equal(mon(ai,'status').awaitingBody,1);
 confirm(ai,unconfirmed);
 assert.equal(mon(ai,'claim',{sessionId:as.sessionId,feedOnly:true}).reason,'waiting');
 ok('unconfirmed articles never reach AI; a cron claim never takes AI work even for a confirmed article');
 w=mon(ai,'claim',{sessionId:as.sessionId});assert.equal(w.phase,'ai');assert.equal(w.target_id,unconfirmed.id);
 const prepared=x=>({id:x.work_id,kind:'comment',input_hash:'a'.repeat(64),input:{provider:'anthropic',model:'claude-haiku-4-5',profileId:ai.profile,profileRevision:1,accountId:ai.account,facts:[],rightsConfirmed:true,externalAiConfirmed:true,post:{blogId:'alpha',postId:'201',title:'Camping',body,hash:sha(['Camping',body])}}});
 const over=mon(ai,'reserve_ai',{...bind(w),prepared:prepared(w),amountMicros:2000001,quoteHash:quote.hash,runHash:'b'.repeat(64)});assert.equal(over.phase,'budget');
 st=mon(ai,'status').monitor;assert.equal(st.state,'paused');assert.equal(st.reserved_micros,0);assert.equal(sql(`select count(*) from bnc_message_jobs where user_id=${q(ai.user)};`),'0');
 ok('over-budget reservation stops before any message job exists');
 mon(ai,'acknowledge',{sessionId:as.sessionId,confirmed:true});
 assert.equal(sql(`select state from bnc_monitor_attempts where user_id=${q(ai.user)};`),'blocked');
 const as2=startAi(ai,{expectedRevision:mon(ai,'status').monitor.revision});assert.equal(mon(ai,'claim',{sessionId:as2.sessionId}).reason,'waiting');
 ok('after acknowledgement, the same article is not attempted again');

 // Background budget keeps RSS going.
 const bg=fixture(['alpha']);const bt=addTarget(bg,'alpha','301');confirm(bg,bt);const bs=startAi(bg,{background:true});
 sql(`insert into bnc_feed_checks(user_id,neighbor_id) values(${q(bg.user)},'alpha');`);
 w=mon(bg,'claim',{sessionId:bs.sessionId});assert.equal(w.phase,'ai');
 assert.equal(mon(bg,'reserve_ai',{...bind(w),prepared:{...prepared(w),input:{...prepared(w).input,profileId:bg.profile,accountId:bg.account,post:{...prepared(w).input.post,postId:'301'}}},amountMicros:2000001,quoteHash:quote.hash,runHash:'b'.repeat(64)}).phase,'budget');
 st=mon(bg,'status').monitor;assert.equal(st.state,'active');assert.equal(st.ai_enabled,false);
 ok('budget exhaustion in a background session turns off AI but keeps new-post checks running');

 // Handler + database end to end with mocks.
 const e=fixture(['alpha','beta','gamma']);let paid=0,feeds=0,loseAi=false,feedStatus=200;const jobs=[];
 const fetcher=async url=>{feeds++;const owner=/naver\.com\/([a-z0-9_-]+)\.xml/.exec(url)[1];if(feedStatus!==200)return new Response('',{status:feedStatus});return new Response(`<rss><channel><item><title>Post of ${owner}</title><link>https://blog.naver.com/${owner}/${400+feeds}</link><description>excerpt is never presumed full</description></item></channel></rss>`);};
 const client={upsert:async(key,token)=>{assert.equal(key,'member-own-cron-key');jobs.push({token,enabled:true});return 777;},setEnabled:async(key,id,enabled)=>{assert.equal(key,'member-own-cron-key');assert.equal(id,777);jobs.at(-1).enabled=enabled;}};
 let cronKey=null,allowed=true;
 const rpc=async(user,ns,op,p)=>{try{return {data:call(user,ns,op,p),error:null};}catch(error){return {data:null,error};}};
 const web=createMonitorHandler({serverFeedEnabled:()=>true,member:async()=>({allowed:true,userId:e.user}),key:async()=>'member-own-ai-key',generate:async()=>{paid++;assert.ok(Number(sql(`select ai_count from bnc_monitors where user_id=${q(e.user)};`))>=1);if(loseAi)throw Error('lost');const source=sql(`select id from bnc_analysis_sources where user_id=${q(e.user)} and body=${q(krBody)} limit 1;`);return {text:'방수 덮개와 접이식 의자를 함께 준비하는 과정이 구체적으로 담겨 있어 짐을 챙길 때 참고하기 좋겠어요.',summary:'캠핑 준비',emotion:'차분함',questionNeeded:false,aiLikeScore:3,usedFacts:[],details:[{sourceId:source,quote:'비를 막는 방수 덮개'},{sourceId:source,quote:'가벼운 접이식 의자'}]};},feedEnabled:()=>true,aiEnabled:()=>true,prices:()=>prices,fetcher,rpc,cron:{key:async()=>cronKey,saveKey:async(u,k)=>{cronKey=k;},deleteKey:async()=>{cronKey=null;},client}});
 const req=(operation,p={})=>new Request('https://fixture.test/api/neighbors/monitor',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify({operation,payload:p})});
 const send=async(op,p)=>{const r=await web(req(op,p));return {status:r.status,body:await r.json()};};
 const startBody={accountId:e.account,neighbors:e.neighbors,aiEnabled:false,expectedRevision:0,feedConsent:true,confirmed:true,budgetMicros:0,maxAi:0,background:true,runner:'server'};
 assert.equal((await send('start',startBody)).status,409);assert.equal(jobs.length,0);assert.equal(mon(e,'status').monitor,null);
 assert.equal((await send('cron_key_save',{apiKey:'member-own-cron-key'})).status,200);
 const catalog=await send('catalog');assert.equal(catalog.body.hasCronKey,true);assert.doesNotMatch(JSON.stringify(catalog.body),/member-own-cron-key/);
 const failing={...client};client.upsert=async()=>{throw Error('cron-job.org API 키가 올바르지 않습니다.');};
 const refused=await send('start',startBody);assert.equal(refused.status,409);assert.match(refused.body.error,/API 키/);assert.equal(mon(e,'status').monitor.state,'off');
 client.upsert=failing.upsert;
 const started=await send('start',{...startBody,expectedRevision:mon(e,'status').monitor.revision});assert.equal(started.status,200);assert.equal(feeds,0);assert.equal(jobs.length,1);
 const token=jobs[0].token;assert.match(token,/^bnc_mon_[0-9a-f]{64}$/);
 assert.equal(sql(`select count(*) from bnc_monitor_scheduler where user_id=${q(e.user)} and token_hash=${q(hashMonitorToken(token))} and active;`),'1');
 assert.equal(sql(`select count(*) from bnc_monitor_scheduler where token_hash=${q(token)};`),'0');
 ok('background start needs the member key, refusal leaves no running session, the plain token is not stored');

 const cron=createMonitorCronHandler({rpc,access:async()=>({allowed}),key:async()=>cronKey,client,feedEnabled:()=>true,fetcher});
 const hit=(t=token)=>cron(new Request('https://fixture.test/api/neighbors/monitor/cron',{headers:{authorization:`Bearer ${t}`}}));
 assert.equal((await hit('bnc_mon_'+'0'.repeat(64))).status,401);assert.equal((await hit('wrong')).status,401);assert.equal(feeds,0);
 let r=await hit();assert.equal(r.status,200);assert.equal((await r.json()).reads,3);assert.equal(feeds,3);assert.equal(paid,0);
 assert.equal(sql(`select count(*) from bnc_post_targets where user_id=${q(e.user)} and body='' and not body_confirmed;`),'3');
 assert.notEqual(sql(`select last_called_at is not null from bnc_monitor_scheduler where user_id=${q(e.user)};`),'f');
 r=await hit();assert.equal((await r.json()).reads,0);assert.equal(feeds,3);
 ok('cron token reads each due neighbor once, makes no AI call, and repeats nothing within 15 minutes');

 sql(`update bnc_feed_checks set checked_at=clock_timestamp()-interval '1 hour' where user_id=${q(e.user)};`);feedStatus=429;feeds=3;
 r=await hit();assert.equal(r.status,200);assert.equal((await r.json()).reads,1);assert.equal(mon(e,'status').monitor.state,'active');assert.equal(mon(e,'status').monitor.feed_failures,1);
 feedStatus=200;
 ok('a rate-limited source ends that run with a normal answer and keeps the session');

 const sid=mon(e,'status').monitor.id;
 assert.equal((await send('scheduler_pause',{sessionId:sid})).body.data.paused,true);assert.equal(jobs[0].enabled,false);
 const before=feeds;r=await hit();assert.equal((await r.json()).reason,'paused');assert.equal(feeds,before);
 assert.equal((await send('scheduler_resume',{sessionId:sid})).body.data.paused,false);assert.equal(jobs[0].enabled,true);
 assert.equal((await send('cron_key_delete')).status,409);assert.equal(cronKey,'member-own-cron-key');
 ok('pause and resume switch the member job; the key cannot be removed during a background session');

 allowed=false;r=await hit();assert.equal((await r.json()).reason,'access');assert.equal(mon(e,'status').monitor.state,'off');assert.equal(jobs[0].enabled,false);allowed=true;
 ok('lost program access stops the session and switches the job off');

 jobs[0].enabled=true;sql(`update bnc_monitor_scheduler set active=true where user_id=${q(e.user)};`);r=await hit();assert.equal((await r.json()).reason,'inactive');assert.equal(jobs[0].enabled,false);
 sql(`update bnc_monitors set state='active',background=true,expires_at=created_at where user_id=${q(e.user)};`);jobs[0].enabled=true;
 r=await hit();assert.equal(r.status,200);assert.equal(mon(e,'status').monitor.last_reason,'expired');assert.equal(jobs[0].enabled,false);
 ok('an inactive or expired session switches a leftover job off');

 // Foreground AI end to end.
 const rev=mon(e,'status').monitor.revision;mon(e,'acknowledge',{sessionId:sid,confirmed:true});
 const target=sql(`select id from bnc_post_targets where user_id=${q(e.user)} order by post_id limit 1;`),row=JSON.parse(sql(`select to_jsonb(x) from (select neighbor_id,post_id,title from bnc_post_targets where id=${q(target)})x;`));
 call(e.user,'post','provide',{id:target,confirmed:true,rightsConfirmed:true,body:krBody,hash:sha([row.title,krBody])});
 assert.ok(rev>0);
 const fg=await send('start',{...startBody,aiEnabled:true,aiConsent:true,background:false,profileId:e.profile,profileRevision:1,provider:'anthropic',model:'claude-haiku-4-5',quoteHash:quote.hash,budgetMicros:2000000,maxAi:2,expectedRevision:mon(e,'status').monitor.revision});assert.equal(fg.status,200);assert.equal(paid,0);
 sql(`update bnc_feed_checks set checked_at=clock_timestamp() where user_id=${q(e.user)};`);
 const generate=await send('tick',{sessionId:fg.body.data.sessionId});
 assert.equal(generate.status,200,JSON.stringify(generate.body));assert.equal(paid,1);
 const m=mon(e,'status').monitor;assert.equal(m.state,'active');assert.ok(m.reserved_micros>0);assert.equal(m.ai_count,1);
 const job=JSON.parse(sql(`select to_jsonb(j) from bnc_message_jobs j where user_id=${q(e.user)};`));assert.equal(job.state,'succeeded');assert.equal(job.draft_job_id,null);assert.equal(sql(`select count(*) from bnc_jobs where user_id=${q(e.user)};`),'0');
 assert.equal(call(e.user,'message','get',{id:job.id}).state,'succeeded');assert.equal(sql(`select state from bnc_monitor_attempts where id=${q(job.id)};`),'succeeded');
 assert.ok(sql(`select j.expires_at<=s.expires_at from bnc_message_jobs j join bnc_analysis_sources s on s.id=any(j.sources) where j.id=${q(job.id)};`)==='t');
 assert.equal((await send('tick',{sessionId:fg.body.data.sessionId})).status,200);assert.equal(paid,1);
 ok('a visible tab reserves budget first, makes one AI call, stores an unapproved result, and never repeats it');
 const second=sql(`select id from bnc_post_targets where user_id=${q(e.user)} and not body_confirmed order by post_id limit 1;`),secondRow=JSON.parse(sql(`select to_jsonb(x) from (select title from bnc_post_targets where id=${q(second)})x;`));
 call(e.user,'post','provide',{id:second,confirmed:true,rightsConfirmed:true,body:krBody+' 두 번째 글입니다.',hash:sha([secondRow.title,krBody+' 두 번째 글입니다.'])});
 loseAi=true;sql(`update bnc_monitors set last_kind='feed' where user_id=${q(e.user)};`);
 const lost=await send('tick',{sessionId:fg.body.data.sessionId});assert.equal(lost.status,409);assert.doesNotMatch(lost.body.error,/설정/);assert.equal(paid,2);
 assert.equal(mon(e,'status').monitor.state,'paused');assert.equal(sql(`select count(*) from bnc_message_jobs where user_id=${q(e.user)} and state='uncertain';`),'1');
 assert.equal((await send('tick',{sessionId:fg.body.data.sessionId})).status,200);assert.equal(paid,2);
 assert.throws(()=>mon(e,'acknowledge',{sessionId:fg.body.data.sessionId,confirmed:true}),/MONITOR_BUSY/);
 sql(`update bnc_monitors set lease_until=clock_timestamp()-interval '1 second' where user_id=${q(e.user)};`);mon(e,'acknowledge',{sessionId:fg.body.data.sessionId,confirmed:true});
 const again=await send('start',{...startBody,aiEnabled:true,aiConsent:true,background:false,profileId:e.profile,profileRevision:1,provider:'anthropic',model:'claude-haiku-4-5',quoteHash:quote.hash,budgetMicros:2000000,maxAi:2,expectedRevision:mon(e,'status').monitor.revision});assert.equal(again.status,200);
 loseAi=false;assert.equal((await send('tick',{sessionId:again.body.data.sessionId})).status,200);assert.equal(paid,2);
 ok('a lost AI result pauses, charges nothing further, and neither retry nor restart regenerates that article');
 // Extension sessions: the member's PC reads RSS, the server only stores what is new.
 const xa=fixture(['alpha','beta']),xo=fixture(['alpha']),xs=startFeed(xa,{runner:'extension'}),sync0={reads:0,failures:0,lastReadAt:null};
 let xr=mon(xa,'extension_sync',sync0);assert.equal(xr.active,true);assert.equal(xr.sessionId,xs.sessionId);assert.deepEqual(xr.neighbors,['alpha','beta']);assert.ok(mon(xa,'status').monitor.runner_seen_at);
 assert.equal(mon(xa,'claim',{sessionId:xs.sessionId}).phase,'idle');assert.equal(mon(xa,'status').monitor.feed_count,0);assert.equal(sql(`select count(*) from bnc_feed_checks where user_id=${q(xa.user)};`),'0');
 ok('an extension session gets its neighbor list and the server never claims a read for it');
 const xpost=(blog,id,title='Trip')=>({blogId:blog,postId:id,title,body:'',hash:sha([title,'']),publishedAt:null});
 const report=(a,s,n,...ids)=>mon(a,'extension_report',{sessionId:s,neighborId:n,posts:ids.map(i=>xpost(n,i))});
 assert.equal(report(xa,xs.sessionId,'alpha','701').savedCount,1);assert.equal(report(xa,xs.sessionId,'alpha','701').savedCount,0);
 assert.equal(sql(`select body='' and not body_confirmed from bnc_post_targets where user_id=${q(xa.user)} and post_id='701';`),'t');assert.ok(mon(xa,'status').monitor.last_feed_at);
 assert.throws(()=>report(xa,xs.sessionId,'gamma','702'),/MONITOR_CHANGED/);assert.throws(()=>report(xo,xs.sessionId,'alpha','702'),/MONITOR_CHANGED/);
 assert.throws(()=>mon(xa,'extension_report',{sessionId:xs.sessionId,neighborId:'alpha',posts:[xpost('beta','703')]}),/TARGET_CHANGED/);
 assert.equal(sql(`select count(*) from bnc_post_targets where user_id=${q(xo.user)};`),'0');
 ok('reports save metadata once, stay inside the session neighbors and never reach another member');
 sql(`update bnc_post_targets set created_at=t.c,expires_at=t.c+interval '720 hours' from (select clock_timestamp()-interval '721 hours' c) t where user_id=${q(xa.user)} and post_id='701';`);
 assert.equal(report(xa,xs.sessionId,'alpha','701','704').savedCount,1);
 ok('one expired article cannot block the new posts of that neighbor');
 mon(xa,'extension_sync',{reads:7,failures:2,lastReadAt:'2099-01-01T00:00:00Z'});let xm=mon(xa,'status').monitor;assert.equal(xm.feed_count,7);assert.equal(xm.feed_failures,2);assert.ok(Date.parse(xm.last_feed_at)<Date.parse('2090-01-01'));
 sql(`update bnc_neighbor_directory set new_posts_enabled=false where user_id=${q(xa.user)} and neighbor_id='beta';`);assert.deepEqual(mon(xa,'extension_sync',sync0).neighbors,['alpha']);assert.throws(()=>report(xa,xs.sessionId,'beta','705'),/TARGET_DISABLED/);
 ok('hourly counters are stored, a future date is capped, a neighbor turned off leaves the list');
 const xt='bnc_mon_'+'e'.repeat(64),xfeeds=feeds;call(xa.user,'scheduler','rotate',{tokenHash:hashMonitorToken(xt)});
 assert.equal((await (await cron(new Request('https://fixture.test/c',{headers:{authorization:`Bearer ${xt}`}}))).json()).reason,'inactive');assert.equal(feeds,xfeeds);assert.equal(mon(xa,'status').monitor.state,'active');
 ok('a leftover cron-job.org call does not read RSS for an extension session');
 mon(xa,'stop',{sessionId:xs.sessionId});assert.equal(mon(xa,'extension_sync',sync0).active,false);assert.throws(()=>report(xa,xs.sessionId,'alpha','706'),/MONITOR_CHANGED/);
 const xserver=fixture(['alpha']);startFeed(xserver);assert.equal(mon(xserver,'extension_sync',sync0).active,false);assert.equal(mon(xo,'extension_sync',sync0).active,false);
 const xold=fixture(['alpha']);startFeed(xold,{runner:'extension'});sql(`update bnc_monitors set expires_at=clock_timestamp()-interval '1 second' where user_id=${q(xold.user)};`);assert.equal(mon(xold,'extension_sync',sync0).active,false);assert.equal(mon(xold,'status').monitor.last_reason,'expired');
 const xlost=fixture(['alpha']);startFeed(xlost,{runner:'extension'});sql(`update member_platform_accounts set needs_reconnect=true where id=${q(xlost.account)};`);assert.equal(mon(xlost,'extension_sync',sync0).active,false);
 ok('stopping, a server session, no session, expiry and a lost account all tell the PC to stop');
 // Retention: generated records follow their source; connection settings end with the member's settings row.
 const old=fixture(['alpha']),oldT=addTarget(old,'alpha','501'),oldS=startFeed(old);
 sql(`insert into bnc_monitor_attempts(id,user_id,session_id,target_id,neighbor_id,post_id,state,expires_at) values(gen_random_uuid(),${q(old.user)},${q(oldS.sessionId)},${q(oldT.id)},'alpha','501','blocked',clock_timestamp()-interval '1 second');
 update bnc_monitors set created_at=now()-interval '38 days',expires_at=now()-interval '31 days' where user_id=${q(old.user)};`);
 const liveBefore=sql(`select count(*) from bnc_monitors where user_id=${q(a.user)};`);
 assert.throws(()=>call(old.user,'monitor','cleanup',{}),/INVALID_INPUT/);
 assert.equal(call(null,'monitor','cleanup',{}).expiredMonitorRecordsRemoved,2);
 assert.equal(sql(`select count(*) from bnc_monitors where user_id=${q(old.user)};`),'0');assert.equal(sql(`select count(*) from bnc_monitors where user_id=${q(a.user)};`),liveBefore);
 assert.throws(()=>call(null,'scheduler','get'),/INVALID_INPUT/);assert.throws(()=>call(e.user,'scheduler','lookup',{tokenHash:'a'.repeat(64)}),/INVALID_INPUT/);
 sql(`delete from bnc_settings where user_id=${q(e.user)};`);assert.equal(sql(`select count(*) from bnc_monitor_scheduler where user_id=${q(e.user)};`),'0');
 ok('expired monitor records are cleaned; other members are untouched; scheduler rows end with the member');
 console.log(`passed ${tests} scenarios with ${sqlCalls} SQL calls; external actions 0`);
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}
