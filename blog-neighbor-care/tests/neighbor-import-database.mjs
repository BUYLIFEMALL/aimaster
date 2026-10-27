import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createNeighborImportHandler} from '../src/lib/neighbors/importApi.ts';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {createReaderController,SITE} from '../extension/background.mjs';
import {managementFixture,shellFixture,fixtureListUrl} from './fixtures/neighbor-import.mjs';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-import-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
assert.match(container,/^[a-f0-9]{64}$/);
const args=['exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres'];
const q=s=>`'${String(s).replaceAll("'","''")}'`,json=v=>`${q(JSON.stringify(v))}::jsonb`,hash=s=>createHash('sha256').update(s).digest('hex');
const sql=(text,role='postgres',user)=>execFileSync('docker',args,{input:(role==='postgres'?'':`set role ${role};`)+(user?`select set_config('request.jwt.claim.sub',${q(user)},false);`:'')+text,encoding:'utf8',stdio:['pipe','pipe','pipe'],windowsHide:true}).trim();
const parse=s=>JSON.parse(s.split('\n').filter(Boolean).at(-1));
const statement=(user,op,p={})=>`select public.bnc_neighbor_import_dispatch(${user?`${q(user)}::uuid`:'null'},${q(op)},${json(p)});`;
const rpc=(m,op,p={})=>parse(sql(statement(m?.user,op,p),'service_role'));
const parallel=text=>new Promise((resolve,reject)=>{const child=spawn('docker',args,{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',reject);child.on('close',code=>code===0?resolve(out.trim()):reject(Error(err)));child.stdin.end(text);});
const tests=[];const check=async(name,fn)=>{await fn();tests.push(name);console.log(`ok ${tests.length} - ${name}`);};
let serial=0;
function member(user=randomUUID()){
 const blog=`fixture-${++serial}`;sql(`insert into auth.users values(${q(user)}) on conflict do nothing;`);
 const code=hash(randomUUID());sql(`select public.bnc_reader_dispatch(${q(user)},'pair_issue',${json({code_hash:code,blog_id:blog})});`,'service_role');
 const device=parse(sql(`select public.bnc_reader_dispatch(${q(user)},'pair_connect',${json({code_hash:code,token_hash:hash(randomUUID()),device_name:'Fixture Edge'})});`,'service_role'));
 const account=sql(`select account_id from public.bnc_reader_devices where id=${q(device.deviceId)};`);
 return {user,device:device.deviceId,account,blog};
}
const start=(m,id=randomUUID())=>{rpc(m,'start',{id,device_id:m.device});return id;};
const reserve=(m,id,page=1)=>{const nonce=hash(randomUUID());rpc(m,'reserve',{id,device_id:m.device,page,nonce_hash:nonce});return nonce;};
const snap=(m,rows,page=1,totalPages=1,totalCount=rows.length)=>({format:'naver-visible-neighbors-v1',url:`https://admin.blog.naver.com/ManageMyBuddy.naver?blogId=${m.blog}&page=${page}`,listScope:'all',page,totalPages,totalCount,rows,nextUrl:page<totalPages?`https://admin.blog.naver.com/ManageMyBuddy.naver?blogId=${m.blog}&page=${page+1}`:null});
const put=(m,id,snapshot,nonce=reserve(m,id,snapshot.page))=>{const bound={...snapshot,blogId:m.blog};return rpc(m,'page',{id,device_id:m.device,page:snapshot.page,nonce_hash:nonce,snapshot:bound,snapshot_hash:hash(JSON.stringify(bound))});};
const rows=[{blogId:'n-one',relation:'mutual'},{blogId:'n-two',relation:'one_way'}];
const directory=m=>rpc(m,'directory',{account_id:m.account});
const configure=(m,patch)=>rpc(m,'configure',{account_id:m.account,...patch});
let removed=false;
try{
 let ready=false;for(let i=0;i<80;i++){try{const logs=execFileSync('docker',['logs',container],{encoding:'utf8',stdio:['pipe','pipe','pipe']});if(logs.includes('init process complete')){sql('select 1;');ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}assert.ok(ready);
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql','../supabase/migrations/20261027141316_bnc_neighbor_import.sql'])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 await check('IDB01 five tables RLS, private RPC, read gate default off and non-writable by service',()=>{
  assert.equal(sql("select count(*) from pg_class where relnamespace='public'::regnamespace and relname in ('bnc_neighbor_import_policy','bnc_neighbor_imports','bnc_neighbor_import_pages','bnc_neighbor_import_daily','bnc_neighbor_directory') and relrowsecurity;"),'5');
  assert.equal(sql('select read_allowed from public.bnc_neighbor_import_policy;'),'f');
  assert.throws(()=>sql('update public.bnc_neighbor_import_policy set read_allowed=true,reference=\'fixture\';','service_role'),/permission denied/);
  assert.throws(()=>sql(statement(randomUUID(),'start',{}),'authenticated'),/permission denied/);
 });
 const owner=member(),other=member();
 await check('IDB02 missing platform permission blocks start without page reservation',()=>{
  assert.throws(()=>start(owner),/BNC_IMPORT_READ_DISABLED/);assert.equal(sql('select count(*) from public.bnc_neighbor_import_daily;'),'0');
 });
 sql("update public.bnc_neighbor_import_policy set read_allowed=true,reference='offline synthetic fixtures only';");
 await check('IDB03 wrong user/device or disconnected account never starts import',()=>{
  assert.throws(()=>rpc(other,'start',{id:randomUUID(),device_id:owner.device}),/BNC_IMPORT_DISCONNECTED/);
  sql(`update public.member_platform_accounts set needs_reconnect=true where id=${q(other.account)};`);assert.throws(()=>start(other),/BNC_IMPORT_ACCOUNT/);
  sql(`update public.member_platform_accounts set needs_reconnect=false where id=${q(other.account)};`);
  const wrong=member(),wrongRun=start(wrong),nonce=reserve(wrong,wrongRun),foreign={...snap(wrong,rows),blogId:'different-actor'};
  assert.throws(()=>rpc(wrong,'page',{id:wrongRun,device_id:wrong.device,page:1,nonce_hash:nonce,snapshot:foreign,snapshot_hash:hash(JSON.stringify(foreign))}),/BNC_IMPORT_ACCOUNT/);
  rpc(wrong,'cancel',{id:wrongRun});
 });
 let run;
 await check('IDB04 sequential pages stay staged until exact coverage and explicit confirmation',()=>{
  run=start(owner);put(owner,run,snap(owner,[rows[0]],1,2,2));assert.equal(directory(owner).total,0);
  assert.throws(()=>rpc(owner,'confirm',{id:run}),/BNC_IMPORT_STATE/);
  assert.equal(put(owner,run,snap(owner,[rows[1]],2,2,2)).state,'ready');
  const result=rpc(owner,'get',{id:run});assert.equal(result.capturedCount,2);assert.equal(result.rows.length,2);assert.equal(result.canAutoEngage,false);
 });
 await check('IDB05 confirmation defaults mutual targets on and ordinary off, does not authorize worker',()=>{
  const confirmed=rpc(owner,'confirm',{id:run});assert.equal(confirmed.count,2);assert.equal(confirmed.canAutoEngage,false);
  const d=directory(owner);assert.equal(d.total,2);assert.equal(d.records[0].new_posts_enabled,true);assert.equal(d.records[1].new_posts_enabled,false);
  assert.equal(sql('select count(*) from public.bnc_neighbors;'),'0');assert.equal(sql('select live_allowed from public.bnc_runtime;'),'f');
  assert.equal(rpc(owner,'confirm',{id:run}).reused,true);
  const nonce=sql(`select nonce_hash from public.bnc_neighbor_import_pages where import_id=${q(run)} and page=2;`);
  assert.equal(put(owner,run,snap(owner,[rows[1]],2,2,2),nonce).reused,true);
  assert.equal(sql(`select expires_at=created_at+interval '720 hours' from public.bnc_neighbor_imports where id=${q(run)};`),'t');
 });
 await check('IDB06 reimport preserves member toggles/created time and never removes absent neighbors',()=>{
  configure(owner,{ids:['n-one'],new_posts:false,return_visits:false});const created=sql(`select created_at from public.bnc_neighbor_directory where user_id=${q(owner.user)} and neighbor_id='n-one';`);
  const next=start(owner);put(owner,next,snap(owner,[rows[0],{blogId:'n-three',relation:'mutual'}]));rpc(owner,'confirm',{id:next});
  const d=directory(owner);assert.equal(d.total,3);assert.equal(d.records.find(r=>r.neighbor_id==='n-one').new_posts_enabled,false);assert.equal(d.records.find(r=>r.neighbor_id==='n-three').new_posts_enabled,true);
  assert.equal(sql(`select created_at from public.bnc_neighbor_directory where user_id=${q(owner.user)} and neighbor_id='n-one';`),created);
 });
 await check('IDB07 page omissions, duplicate IDs, changed totals and overcount cannot complete',()=>{
  for(const bad of [s=>({...s,totalCount:3}),s=>({...s,rows:[rows[0]]}),s=>({...s,rows:[rows[1],rows[1]]})]){
   const m=member(),id=start(m);put(m,id,snap(m,[rows[0]],1,2,2));assert.throws(()=>put(m,id,bad(snap(m,[rows[1]],2,2,2))),/BNC_IMPORT_CHANGED|BNC_IMPORT_INCOMPLETE/);assert.equal(directory(m).total,0);
  }
 });
 await check('IDB08 only one concurrent reservation wins, budget consumed once',async()=>{
  const m=member(),id=start(m);const results=await Promise.allSettled(Array.from({length:30},()=>parallel(`set role service_role;${statement(m.user,'reserve',{id,device_id:m.device,page:1,nonce_hash:hash(randomUUID())})}`)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(sql(`select used from public.bnc_neighbor_import_daily where user_id=${q(m.user)};`),'1');
 });
 await check('IDB09 daily budget is shared across actor accounts and devices',async()=>{
  const a=member(),b=member(a.user),ia=start(a),ib=start(b);sql(`insert into public.bnc_neighbor_import_daily values(${q(a.user)},(now() at time zone 'Asia/Seoul')::date,99);`);
  const results=await Promise.allSettled([a,b].map((m,i)=>parallel(`set role service_role;${statement(m.user,'reserve',{id:i?ib:ia,device_id:m.device,page:1,nonce_hash:hash(randomUUID())})}`)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(sql(`select used from public.bnc_neighbor_import_daily where user_id=${q(a.user)};`),'100');
 });
 await check('IDB10 cancel removes staged IDs without deleting directory or refunding reads',()=>{
  const id=start(owner);put(owner,id,snap(owner,[rows[0]],1,2,2));const used=sql(`select used from public.bnc_neighbor_import_daily where user_id=${q(owner.user)};`);
  rpc(owner,'cancel',{id});assert.equal(rpc(owner,'get',{id}).rows.length,0);assert.equal(directory(owner).total,3);assert.equal(sql(`select used from public.bnc_neighbor_import_daily where user_id=${q(owner.user)};`),used);
 });
 await check('IDB11 expired nonce/run and revoked device or policy revision block writes',()=>{
  const m=member(),id=start(m),nonce=reserve(m,id);sql(`update public.bnc_neighbor_import_pages set valid_until=now()-interval '1 second' where import_id=${q(id)};`);
  assert.throws(()=>put(m,id,snap(m,rows),nonce),/BNC_IMPORT_EXPIRED/);
  sql(`update public.bnc_neighbor_imports set valid_until=now()-interval '1 second' where id=${q(id)};`);assert.equal(rpc(m,'get',{id}).state,'expired');
  const m2=member(),i2=start(m2);put(m2,i2,snap(m2,rows));sql(`update public.bnc_reader_devices set revoked_at=now() where id=${q(m2.device)};`);assert.throws(()=>rpc(m2,'confirm',{id:i2}),/BNC_IMPORT_DISCONNECTED/);
  sql(`update public.member_platform_accounts set needs_reconnect=true where id=${q(m2.account)};`);assert.equal(rpc(m2,'cancel',{id:i2}).state,'cancelled');
  const m3=member(),i3=start(m3);put(m3,i3,snap(m3,rows));sql('update public.bnc_neighbor_import_policy set revision=revision+1;');assert.throws(()=>rpc(m3,'confirm',{id:i3}),/BNC_IMPORT_READ_DISABLED/);
 });
 await check('IDB12 RLS hides other member directory; bulk toggle is atomic with count guard',()=>{
  assert.equal(sql(`select count(*) from public.bnc_neighbor_directory where user_id=${q(owner.user)};`,'authenticated',other.user).split('\n').at(-1),'0');
  assert.throws(()=>sql(`update public.bnc_neighbor_directory set new_posts_enabled=true where user_id=${q(owner.user)};`,'authenticated',owner.user),/permission denied/);
  assert.throws(()=>configure(owner,{all:true,expected_total:2,new_posts:true,return_visits:true}),/BNC_IMPORT_CHANGED/);
  assert.equal(configure(owner,{all:true,expected_total:3,new_posts:false,return_visits:false}).updated,3);
  assert.throws(()=>configure(owner,{ids:['n-one','not-owned'],new_posts:true,return_visits:true}),/BNC_IMPORT_NOT_FOUND/);
 });
 await check('IDB13 member and extension HTTP handlers call actual SQL with server-bound identity/nonce',async()=>{
  const m=member(),token='a'.repeat(64);const deps={member:async()=>({allowed:true,userId:m.user}),user:async user=>({allowed:true,userId:user}),device:async hashed=>hashed===hash(token)?{userId:m.user,deviceId:m.device}:null,
   rpc:async(user,op,p)=>{try{return {data:rpc({user},op,p),error:null};}catch(e){return {data:null,error:{message:e.message}};}}};
  const ext=createNeighborImportHandler(deps,true),web=createNeighborImportHandler(deps);
  const send=(handler,operation,payload)=>handler(new Request('https://fixture.test/api/neighbors/import/'+(handler===ext?'extension':'member'),{method:'POST',headers:{'content-type':'application/json',...(handler===ext?{authorization:`Bearer ${token}`}:{origin:'https://fixture.test'})},body:JSON.stringify({operation,payload})}));
  const id=randomUUID();assert.equal((await send(ext,'start',{id,ownerConfirmed:true})).status,200);
  const permit=await(await send(ext,'reserve',{id,page:1})).json();assert.equal(typeof permit.nonce,'string');assert.equal(sql(`select nonce_hash from public.bnc_neighbor_import_pages where import_id=${q(id)};`),hash(permit.nonce));
  assert.equal((await send(ext,'page',{id,nonce:permit.nonce,snapshot:snap(m,rows)})).status,200);
  assert.equal((await send(web,'confirm',{id,confirmed:true})).status,200);assert.equal(directory(m).total,2);
  assert.equal((await send(ext,'confirm',{id,confirmed:true})).status,400);assert.equal((await send(web,'reserve',{id,page:1})).status,400);
 });
 function pipeline(m,config={}){
  const token='a'.repeat(64),session={},events=[];let page=1;
  const state={page:1,active:true};const top=`https://admin.blog.naver.com/${m.blog}`;
  const local={token},storage=data=>({get:async k=>({[k]:data[k]}),set:async patch=>Object.assign(data,patch),remove:async k=>{delete data[k];},setAccessLevel:async()=>{}});
  const deps={member:async()=>({allowed:true,userId:m.user}),user:async()=>({allowed:true,userId:m.user}),device:async()=>({userId:m.user,deviceId:m.device}),rpc:async(user,op,p)=>{events.push(op);try{return {data:rpc({user},op,p),error:null};}catch(e){return {data:null,error:{message:e.message}};}}};
  const ext=createNeighborImportHandler(deps,true),web=createNeighborImportHandler(deps);
  const sender={id:'fixture-extension',url:'chrome-extension://fixture-extension/popup.html'};
  const browser={runtime:{id:sender.id,getURL:p=>`chrome-extension://fixture-extension/${p}`},storage:{local:storage(local),session:storage(session)},windows:{get:async()=>({focused:true})},tabs:{query:async()=>[{id:7,windowId:1,url:top,active:state.active}],get:async()=>({id:7,url:top,status:'complete'})},scripting:{executeScript:async({func,args})=>{
   if(func.name==='advanceVisibleNeighborPage')assert.equal(events.at(-1),'reserve');
   events.push(func.name);
   const execute=(html,url)=>{const {document}=parseHTML(html);document.querySelectorAll('*').forEach(e=>{e.getClientRects=()=>[{}];});document.querySelectorAll('a[href]').forEach(a=>{a.click=()=>{const next=new URL(a.getAttribute('href'));page=Number(next.searchParams.get('currentPage'));state.page=page;};});document.readyState='complete';return vm.runInNewContext(`(${func.toString()})(...args)`,{document,location:{href:url},URL,args});};
   const results=[{frameId:0,result:execute(shellFixture(m.blog),top)},{frameId:1,result:execute(managementFixture({blogId:m.blog,page,...config}),fixtureListUrl(m.blog,page))}];
   config.afterScript?.(func.name,state);return results;
  }}};
  const fetcher=async(url,options)=>{
   if(url===SITE+'/api/reader/extension'){assert.equal(JSON.parse(options.body).operation,'whoami');return Response.json({data:{deviceId:m.device,blogId:m.blog}});}
   assert.equal(url,SITE+'/api/neighbors/import/extension');return ext(new Request(url,options));
  };
  const handle=createReaderController(browser,fetcher);
  return {events,session,state,read:()=>handle({type:'neighbors_read',ownerConfirmed:true},sender),web:async(operation,payload)=>web(new Request(SITE+'/api/neighbors/import/member',{method:'POST',headers:{'content-type':'application/json',origin:SITE},body:JSON.stringify({operation,payload})}))};
 }
 await check('IDB15 controller -> serialized DOM -> 3 frame pages -> HTTP -> SQL -> member confirmation',async()=>{
  const m=member(),f=pipeline(m),result=await f.read();assert.equal(result.state,'ready');assert.equal(result.capturedCount,125);assert.equal(directory(m).total,0);
  assert.equal(f.events.filter(e=>e==='advanceVisibleNeighborPage').length,2);assert.equal(f.events.filter(e=>e==='reserve').length,3);
  assert.equal(sql(`select used from public.bnc_neighbor_import_daily where user_id=${q(m.user)};`),'3');
  const get=await(await f.web('get',{id:result.id})).json();assert.equal(get.data.rows.length,51);assert.equal(get.data.totalPages,3);
  assert.equal((await f.web('confirm',{id:result.id,confirmed:true})).status,200);const d=directory(m);assert.equal(d.total,125);assert.equal(d.records.length,51);
  let cursor=null,records=[];for(let i=0;i<3;i++){const data=rpc(m,'directory',{account_id:m.account,cursor});const batch=data.records.slice(0,50);records.push(...batch);cursor=batch.at(-1)?.neighbor_id;}
  assert.equal(new Set(records.map(r=>r.neighbor_id)).size,125);assert.equal(records.filter(r=>r.new_posts_enabled).length,63);assert.equal(records.filter(r=>r.return_visits_enabled).length,63);
  assert.equal(JSON.stringify(f.session).includes('fixture-neighbor'),false);assert.equal(sql('select count(*) from public.bnc_neighbors;'),'0');
 });
 await check('IDB16 explicit empty DOM completes zero-row request without deleting existing neighbors',async()=>{
  const m=member(),first=start(m);put(m,first,snap(m,rows));rpc(m,'confirm',{id:first});
  const f=pipeline(m,{total:0,pages:1}),result=await f.read();assert.equal(result.state,'ready');assert.equal(result.capturedCount,0);
  const confirm=await(await f.web('confirm',{id:result.id,confirmed:true})).json();assert.equal(confirm.data.count,0);assert.equal(directory(m).total,2);assert.equal(f.events.filter(e=>e==='reserve').length,1);
 });
 await check('IDB17 loading placeholder and RSS row never upload or produce ready imports',async()=>{
  for(const config of [{total:0,pages:1,emptyText:'불러오는 중입니다.'},{rss:true}]){
   const m=member(),f=pipeline(m,config);await assert.rejects(f.read());assert.equal(f.events.includes('page'),false);assert.equal(directory(m).total,0);
   const id=f.session.neighborImport.id;assert.equal(rpc(m,'get',{id}).state,'capturing');assert.equal((await f.web('cancel',{id})).status,200);
  }
 });
 await check('IDB18 page-two tab change leaves exact partial receipt; confirm blocked, cancellation preserves directory',async()=>{
  let captures=0;const m=member(),f=pipeline(m,{afterScript:(name,state)=>{if(name==='inspectVisibleNeighbors'&&++captures===2)state.active=false;}});
  await assert.rejects(f.read());const id=f.session.neighborImport.id,receipt=rpc(m,'get',{id});assert.equal(receipt.state,'capturing');assert.equal(receipt.lastPage,1);assert.equal(receipt.capturedCount,50);assert.equal(f.events.filter(e=>e==='page').length,1);
  assert.equal((await f.web('confirm',{id,confirmed:true})).status,409);assert.equal(directory(m).total,0);assert.equal((await f.web('cancel',{id})).status,200);assert.equal(rpc(m,'get',{id}).rows.length,0);
 });
 await check('IDB14 expiry cleanup deletes temporary source and receipts but preserves minimal member settings',()=>{
  sql(`update public.bnc_neighbor_import_pages set expires_at=now()-interval '1 second';`);rpc(null,'cleanup');assert.equal(sql('select count(*) from public.bnc_neighbor_import_pages;'),'0');
  sql(`update public.bnc_neighbor_imports set expires_at=now()-interval '1 second';`);rpc(null,'cleanup');assert.equal(sql('select count(*) from public.bnc_neighbor_imports;'),'0');assert.equal(directory(owner).total,3);
  assert.equal(sql(`select count(*) from public.bnc_neighbor_directory where user_id=${q(owner.user)} and last_import_id is not null;`),'0');
 });
 assert.equal(tests.length,18);
}finally{
 removed=execFileSync('docker',['rm','-f',container],{encoding:'utf8'}).trim()===container;
 writeFileSync(new URL('../docs/evidence/neighbor-import-database-20261027.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),tests,passed:tests.length,expected:18,containerStopped:removed,operatingDatabaseChanged:false,realCredentialsUsed:false,fixture:'Isolated PostgreSQL17, network none, no published ports; real controller + serialized DOM (linkedom layout stub) + HTTP handlers + actual SQL; not installed extension or production PostgREST'},null,2)+'\n');
}
