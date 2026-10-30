import {createMonitorHandler,monitorQuotes} from '../src/lib/neighbors/monitor.ts';
import {prepareMessage,messagePrompt} from '../src/lib/messages/contracts.ts';
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
const migration='20261030160000_bnc_monitor.sql';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-monitor-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
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
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261027042907_bnc_analysis.sql','../supabase/migrations/20261027141316_bnc_neighbor_import.sql','../supabase/migrations/20261028124500_bnc_work_cancel.sql','../supabase/migrations/20261028233611_bnc_execution_evidence.sql','../supabase/migrations/20261029140000_bnc_engagement_inbox.sql','../supabase/migrations/20261028143000_bnc_schedule_preferences.sql','../supabase/migrations/20261029044735_bnc_schedule_cursor.sql','../supabase/migrations/20261030001500_bnc_extension_execution.sql','../supabase/migrations/20261030120000_bnc_extension_schedule.sql','../supabase/migrations/20261030133000_bnc_incoming_accept.sql','../supabase/migrations/20261030101500_bnc_message_generation.sql','../supabase/migrations/20261030143000_bnc_post_targets.sql','../supabase/migrations/20261030150000_bnc_accept_schedule.sql',`../supabase/migrations/${migration}`])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
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

 // WIP checkpoint: fixtures/migration loading only. Add assertions before using.
 throw new Error('MONITOR_DATABASE_WIP: no database assertions implemented yet');
}finally{execFileSync('docker',['stop',container],{windowsHide:true,stdio:'pipe'});}
