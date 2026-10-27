import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createAnalysisHandler} from '../src/lib/analysis/api.ts';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-analysis-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
assert.match(container,/^[a-f0-9]{64}$/);
const args=['exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres'];
const q=s=>`'${String(s).replaceAll("'","''")}'`,json=s=>`${q(JSON.stringify(s))}::jsonb`,hash=s=>createHash('sha256').update(s).digest('hex');
const sql=(text,role='postgres')=>execFileSync('docker',args,{input:(role==='postgres'?'':`set role ${role};`)+text,encoding:'utf8',stdio:['pipe','pipe','pipe'],windowsHide:true}).trim();
const parse=s=>JSON.parse(s.split('\n').filter(Boolean).at(-1));
const statement=(user,op,p={})=>`select public.bnc_analysis_dispatch(${user?`${q(user)}::uuid`:'null'},${q(op)},${json(p)});`;
const rpc=(user,op,p={})=>parse(sql(statement(user,op,p),'service_role'));
const parallel=text=>new Promise((resolve,reject)=>{const p=spawn('docker',args,{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c===0?resolve(out.trim()):reject(Error(err)));p.stdin.end(text);});
const tests=[];const check=async(name,fn)=>{await fn();tests.push(name);console.log(`ok ${tests.length} - ${name}`);};
const member=()=>{const id=randomUUID();sql(`insert into auth.users(id) values(${q(id)});`);return id;};
function material(user,post='123',blog='owner') {
 const id=randomUUID();sql(`insert into public.bnc_reader_requests(id,user_id,blog_id,post_id) values(${q(id)},${q(user)},${q(blog)},${q(post)});
 insert into public.bnc_reader_materials(id,user_id,blog_id,post_id,title,body,content_hash,created_at,expires_at) values(${q(id)},${q(user)},${q(blog)},${q(post)},'가상 캠핑','가상 캠핑 본문을 안전하게 준비합니다.',${q(hash(id))},now()-interval '2 hours',now()+interval '718 hours');`);return id;
}
const preferences={requiredTopics:['캠핑'],excludedTopics:[],region:'',scale:'any',styleSamples:[]};
const profileFields={topics:['캠핑'],interests:[],audience:'입문자',tone:'설명체',phrases:[],keywords:['캠핑']};
function prepare(user,materials,id=randomUUID()) {const input={materialIds:materials,preferences,provider:'openai',model:'gpt-5.6-luna',externalAiConfirmed:true};rpc(user,'prepare',{id,kind:'profile',input_hash:hash(JSON.stringify(input)),input});return id;}
function finish(user,id,result={profile:profileFields}) {const token=hash(randomUUID());rpc(user,'claim',{id,run_hash:token});rpc(user,'complete',{id,run_hash:token,result});return token;}
const posts=[1,2,3].map(n=>({blogId:'neighbor',postId:String(n),title:'가상 캠핑',body:'가상 후보 본문입니다.',hash:hash('candidate'+n)}));
function candidates(user,profile,revision=1,id=randomUUID(),sourcePosts=posts) {const input={provider:'gemini',model:'gemini-3.7-flash',externalAiConfirmed:true,profileId:profile,profileRevision:revision,posts:sourcePosts};rpc(user,'prepare',{id,kind:'candidates',input_hash:hash(JSON.stringify(input)),input});return id;}
let migration='',version='';
try {
 let ready=false;for(let i=0;i<100;i++){
  const logs=execFileSync('docker',['logs',container],{encoding:'utf8',stdio:['pipe','pipe','pipe'],windowsHide:true});
  if(logs.includes('init process complete')){try{sql('select 1;');ready=true;break;}catch{}}
  await new Promise(r=>setTimeout(r,150));
 }assert.ok(ready);
 version=sql('select version();');
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 sql(readFileSync(new URL('../../supabase/migrations/0039_member_integrations.sql',import.meta.url),'utf8'));
 const files=readdirSync(new URL('../supabase/migrations/',import.meta.url));
 sql(readFileSync(new URL('../supabase/migrations/'+files.find(x=>x.endsWith('_bnc_reader_connection.sql')),import.meta.url),'utf8'));
 migration=files.find(x=>x.endsWith('_bnc_analysis.sql'));sql(readFileSync(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8'));
 const owner=member(),other=member(),source=material(owner),foreign=material(other);
 await check('ADB01 신규2표 RLS·서비스전용RPC·회원 직접조회 차단',()=>{
  assert.equal(sql("select count(*) from pg_class where relnamespace='public'::regnamespace and relname in ('bnc_analysis_jobs','bnc_analysis_sources') and relrowsecurity;"),'2');
  assert.equal(sql("select prosecdef from pg_proc where oid='public.bnc_analysis_dispatch(uuid,text,jsonb)'::regprocedure;"),'f');
  for(const role of ['anon','authenticated']){assert.throws(()=>sql(statement(owner,'list'),role),/permission denied/);assert.throws(()=>sql('select * from public.bnc_analysis_jobs;',role),/permission denied/);}
 });
 await check('ADB02 타인 자료·여러 블로그·중복ID 거절',()=>{
  assert.throws(()=>prepare(owner,[foreign]),/SOURCE_UNAVAILABLE/);assert.throws(()=>prepare(owner,[source,source]),/ANALYSIS_INPUT/);
  const second=material(owner,'456','other-blog');assert.throws(()=>prepare(owner,[source,second]),/WRONG_BLOG/);
 });
 const profile=prepare(owner,[source]);
 await check('ADB03 원본 잔여수명 상속·타인 작업 조회/입력변경 차단',()=>{
  assert.deepEqual(rpc(owner,'get',{id:profile}).preferences,preferences);
  assert.equal(sql(`select j.expires_at=m.expires_at from public.bnc_analysis_jobs j join public.bnc_reader_materials m on m.id=any(j.material_ids) where j.id=${q(profile)};`),'t');
  assert.throws(()=>rpc(other,'get',{id:profile}),/NOT_FOUND/);
  assert.throws(()=>rpc(owner,'prepare',{id:profile,kind:'profile',input_hash:hash('changed'),input:{materialIds:[source]}}),/CHANGED/);
 });
 let run;
 await check('ADB04 독립 DB연결40개 동시선점 성공1건',async()=>{
  const token=hash(randomUUID());const results=await Promise.allSettled(Array.from({length:40},()=>parallel('set role service_role;'+statement(owner,'claim',{id:profile,run_hash:token}))));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);run=token;
 });
 await check('ADB05 실행토큰/소유자 불일치 완료 차단',()=>{
  assert.throws(()=>rpc(owner,'complete',{id:profile,run_hash:hash('bad'),result:{}}),/RUN_MISMATCH/);
  assert.throws(()=>rpc(other,'complete',{id:profile,run_hash:run,result:{}}),/NOT_FOUND/);
  rpc(owner,'complete',{id:profile,run_hash:run,result:{profile:profileFields}});
  assert.equal(rpc(owner,'get',{id:profile}).state,'succeeded');assert.throws(()=>rpc(owner,'claim',{id:profile,run_hash:run}),/ALREADY_STARTED/);
 });
 await check('ADB06 회원 확인 전 후보평가 차단·수정 프로필 기록',()=>{
  assert.throws(()=>candidates(owner,profile),/PROFILE_REQUIRED/);
  rpc(owner,'review_profile',{id:profile,revision:0,profile:{profile:profileFields,preferences,memberConfirmed:true}});
  assert.equal(rpc(owner,'get',{id:profile}).revision,1);
  assert.throws(()=>rpc(owner,'review_profile',{id:profile,revision:0,profile:{}}),/STALE_PROFILE/);
 });
 const candidate=candidates(owner,profile);
 await check('ADB07 후보자료 회원격리·같은내용 재사용은 수명 연장 없음',()=>{
  const first=sql(`select min(expires_at) from public.bnc_analysis_sources where user_id=${q(owner)};`);
  const again=candidates(owner,profile);assert.equal(sql(`select min(expires_at) from public.bnc_analysis_sources where user_id=${q(owner)};`),first);
  assert.equal(sql(`select count(*) from public.bnc_analysis_sources where user_id=${q(owner)};`),'3');
  assert.equal(sql(`select expires_at<=(select expires_at from public.bnc_analysis_jobs where id=${q(profile)}) from public.bnc_analysis_jobs where id=${q(again)};`),'t');
  candidates(owner,profile,1,randomUUID(),posts.map((p,i)=>i===0?{...p,body:'수정한 가상 후보 본문',hash:hash('edited-source')}:p));
  assert.equal(sql(`select min(created_at)=max(created_at) and min(expires_at)=max(expires_at) from public.bnc_analysis_sources where user_id=${q(owner)} and blog_id='neighbor' and post_id='1';`),'t');
 });
 await check('ADB08 결과에 있는 후보만 선택·외부실행 없음',()=>{
  finish(owner,candidate,{candidates:[{blogId:'neighbor',topicScore:75}]});
  assert.throws(()=>rpc(owner,'select_candidates',{id:candidate,blogIds:['intruder']}),/ANALYSIS_INPUT/);
  assert.equal(rpc(owner,'select_candidates',{id:candidate,blogIds:['neighbor']}).externalActions,0);
 });
 await check('ADB09 프로필 수정은 기존후보를 무효화·선택/재생성 차단',()=>{
  rpc(owner,'review_profile',{id:profile,revision:1,profile:{profile:profileFields,preferences:{...preferences,region:'서울'}}});
  assert.equal(rpc(owner,'get',{id:candidate}).profileStale,true);
  assert.throws(()=>rpc(owner,'select_candidates',{id:candidate,blogIds:['neighbor']}),/STALE_PROFILE/);
  assert.throws(()=>candidates(owner,profile,1),/STALE_PROFILE/);
 });
 await check('ADB10 응답불명 작업2분후 uncertain·자동 재선점 없음',()=>{
  const id=prepare(owner,[source]);rpc(owner,'claim',{id,run_hash:hash('running')});sql(`update public.bnc_analysis_jobs set run_started_at=now()-interval '3 minutes' where id=${q(id)};`);
  assert.equal(rpc(owner,'get',{id}).state,'uncertain');assert.throws(()=>rpc(owner,'claim',{id,run_hash:hash('new')}),/ALREADY_STARTED/);
 });
 await check('ADB11 HTTP핸들러→실제SQL→가상AI→회원결과재조회',async()=>{
  let calls=0;
  const handler=createAnalysisHandler({member:async()=>({allowed:true,userId:owner}),key:async()=> 'fixture-not-a-secret',
   rpc:async(user,op,p)=>{try{return {data:rpc(user,op,p),error:null};}catch(e){return {data:null,error:{message:e.stderr?.toString()??e.message}};}},
   generate:async(provider,model,key,system,user)=>{calls++;assert.equal(key,'fixture-not-a-secret');const input=JSON.parse(user);
    if(input.profile)return {candidates:[{blogId:'candidate-api',topicScore:81,reasons:['캠핑 주제 일치'],evidence:[{sourceId:input.posts[0].id,quote:'회원 제공 후보 본문'}]}]};
    return {profile:profileFields,evidence:[{sourceId:input.posts[0].id,quote:'가상 캠핑 본문'}]};}});
  const id=randomUUID();const payload={id,provider:'openai',model:'gpt-5.6-luna',externalAiConfirmed:true,materialIds:[source],preferences};
  const send=input=>handler(new Request('https://fixture.test/api/analysis',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify(input)}));
  assert.equal((await send({operation:'profile',payload})).status,200);assert.equal((await send({operation:'profile',payload})).status,200);assert.equal(calls,1);
  assert.equal((await (await send({operation:'get',payload:{id}})).json()).data.state,'succeeded');
  assert.equal((await send({operation:'review_profile',payload:{id,revision:0,profile:profileFields,preferences,confirmed:true}})).status,200);
  const candidateId=randomUUID(),candidateInput={id:candidateId,provider:'gemini',model:'gemini-3.7-flash',externalAiConfirmed:true,
    profileId:id,profileRevision:1,rightsConfirmed:true,posts:[21,22,23].map(n=>({url:`https://blog.naver.com/candidate-api/${n}`,title:'캠핑 자료',body:'회원 제공 후보 본문을 평가합니다.',rightsConfirmed:true}))};
  const response=await send({operation:'candidates',payload:candidateInput});assert.equal(response.status,200,await response.clone().text());
  assert.equal((await response.json()).data.result.candidates[0].overallScore,null);
  assert.equal((await send({operation:'candidates',payload:candidateInput})).status,200);assert.equal(calls,2);
  const selection=await send({operation:'select_candidates',payload:{id:candidateId,blogIds:['candidate-api']}});
  assert.equal(selection.status,200);assert.equal((await selection.json()).data.externalActions,0);
 });
 await check('ADB12 만료결과/자료 조회차단·정리후 파생후보삭제',()=>{
  sql(`update public.bnc_analysis_jobs set expires_at=now()-interval '1 second' where id=${q(profile)};`);
  assert.throws(()=>rpc(owner,'get',{id:profile}),/NOT_FOUND/);rpc(null,'cleanup');
  assert.equal(sql(`select count(*) from public.bnc_analysis_jobs where id=${q(candidate)};`),'0');
  sql(`update public.bnc_analysis_sources set created_at=now()-interval '721 hours',expires_at=now()-interval '1 hour';`);rpc(null,'cleanup');
  assert.equal(sql('select count(*) from public.bnc_analysis_sources;'),'0');
 });
 await check('ADB13 긴 원문은 발췌분량과 원문분량을 구분해 반환',()=>{
  const long=material(owner,'9999');sql(`update public.bnc_reader_materials set body=repeat('가',5001) where id=${q(long)};`);
  const id=prepare(owner,[long]),bundle=rpc(owner,'claim',{id,run_hash:hash('long-source')});
  assert.equal(bundle.posts[0].body.length,4000);assert.equal(bundle.posts[0].originalCharacterCount,5001);assert.equal(bundle.posts[0].bodyTruncated,true);
 });
 await check('ADB14 대기 취소는 본인만·다시 선점 불가·실행중 취소 차단',()=>{
  const id=prepare(owner,[source]);assert.throws(()=>rpc(other,'cancel',{id}),/NOT_FOUND/);
  assert.equal(rpc(owner,'cancel',{id}).state,'cancelled');assert.throws(()=>rpc(owner,'claim',{id,run_hash:hash('cancelled')}),/ALREADY_STARTED/);
  const running=prepare(owner,[source]);rpc(owner,'claim',{id:running,run_hash:hash('active')});
  assert.throws(()=>rpc(owner,'cancel',{id:running}),/ALREADY_STARTED/);
 });
 writeFileSync(new URL('../docs/evidence/analysis-database-20261027.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),database:version,migration,tests,passed:tests.length,network:'none',hostPorts:0,operatingDatabaseChanged:false,realAiCalls:0},null,2)+'\n');
} finally {execFileSync('docker',['rm','-f',container],{stdio:'ignore',windowsHide:true});}
