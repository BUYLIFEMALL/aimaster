import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createAnalysisHandler } from '../src/lib/analysis/api.ts';
import { generation, validateResult } from '../src/lib/analysis/contracts.ts';
import { generateJson } from '../src/lib/analysis/provider.ts';
const OWNER=randomUUID(),SOURCE=randomUUID();
const prefs={requiredTopics:['캠핑'],excludedTopics:['대출'],region:'',scale:'any',styleSamples:[]};
const fields={topics:['캠핑'],interests:['여행'],audience:'캠핑 입문자',tone:'설명체',phrases:['안전하게 준비하는 캠핑'],keywords:['캠핑 준비']};
const post={id:SOURCE,blogId:'owner',postId:'123',title:'안전한 캠핑',body:'안전하게 준비하는 캠핑은 미리 날씨를 확인합니다.',source:'member-initiated-browser-read'};
const output={profile:fields,evidence:[{sourceId:SOURCE,quote:'안전하게 준비하는 캠핑'}]};
const payload=()=>({id:randomUUID(),provider:'openai',model:'gpt-5.6-luna',externalAiConfirmed:true,materialIds:[SOURCE],preferences:prefs});
const request=(body,headers={})=>new Request('https://example.test/api/analysis',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
function setup(options={}) {
  const jobs=new Map(),calls={rpc:[],key:[],generate:0};let auth=0;
  const deps={
    member:async()=>options.access??(options.revokedAfterCall && calls.generate>0 ? {allowed:false,status:403,error:'이용 권한 확인'} : options.switchOwner && auth++>0?{allowed:true,userId:randomUUID()}:{allowed:true,userId:OWNER}),
    key:async(user,provider)=>{calls.key.push({user,provider});return options.noKey?null:'fixture-not-a-secret';},
    generate:async()=>{calls.generate++;if(options.generateError)throw Error('secret-must-not-leak');return options.output??output;},
    rpc:async(user,op,p)=>{
      calls.rpc.push(op);if(options.rpcError===op)return {data:null,error:{message:'private raw SQL '+(options.errorCode??'STORAGE_UNAVAILABLE')}};
      let j=jobs.get(p.id);
      if(op==='prepare'){if(!j){j={id:p.id,state:'queued',input:p.input};jobs.set(p.id,j);}return {data:j,error:null};}
      if(op==='get')return {data:{id:j.id,state:j.state,result:j.result},error:null};
      if(op==='claim'){j.state='running';return {data:{id:j.id,kind:'profile',input:j.input,posts:[post],profile:null,expiresAt:'2026-11-01T00:00:00Z'},error:null};}
      if(op==='complete'){j.state='succeeded';j.result=p.result;}
      if(op==='uncertain')j.state='uncertain';
      return {data:{id:p.id,state:j?.state},error:null};
    },
  };
  const handler=createAnalysisHandler(deps);
  return {calls,jobs,handler,send:body=>handler(request(body))};
}
test('AN01 인증/권한 거절은 JSON·키 조회보다 우선',async()=>{
  for(const status of [401,403]){const s=setup({access:{allowed:false,status,error:'拒否'}});assert.equal((await s.send('{')).status,status);assert.deepEqual(s.calls.key,[]);}
});
test('AN02 동일 출처·JSON 형식·바이트 상한·HTTP 메서드',async()=>{
  const s=setup();assert.equal((await s.handler(request({}, {origin:'https://evil.test'}))).status,403);
  assert.equal((await s.handler(request('{}',{'content-type':'text/plain'}))).status,415);
  assert.equal((await s.handler(request('a'.repeat(196609)))).status,413);
  assert.equal((await s.handler(new Request('https://example.test/api/analysis'))).status,405);
  assert.deepEqual(s.calls.key,[]);
});
test('AN03 명시적 AI 전송 동의·공급자 모델·자료ID·소유자 위조 차단',async()=>{
  for(const patch of [{externalAiConfirmed:false},{provider:'gemini'},{model:'../../evil'},{userId:randomUUID()},{materialIds:[]},{materialIds:[SOURCE,SOURCE]}]){
    const s=setup();assert.equal((await s.send({operation:'profile',payload:{...payload(),...patch}})).status,400);assert.equal(s.calls.generate,0);assert.equal(s.calls.rpc.length,0);
  }
});
test('AN04 회원 본인키만 조회·성공결과 재과금 없음·자료부족 명시',async()=>{
  const s=setup(),p=payload();const response=await s.send({operation:'profile',payload:p});assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(s.calls.key,[{user:OWNER,provider:'openai'}]);
  const data=(await response.json()).data;assert.equal(data.result.provisional,true);assert.equal(data.result.sampleCount,1);
  assert.equal((await s.send({operation:'profile',payload:p})).status,200);assert.equal(s.calls.generate,1);
});
test('AN05 키 미등록은 외부 호출/선점 없이 중단',async()=>{
  const s=setup({noKey:true});const r=await s.send({operation:'profile',payload:payload()});assert.equal(r.status,400);assert.equal((await r.json()).needKey,true);
  assert.equal(s.calls.generate,0);assert.ok(!s.calls.rpc.includes('claim'));
});
test('AN06 실행 직전 회원 전환 차단',async()=>{
  const s=setup({switchOwner:true});assert.equal((await s.send({operation:'profile',payload:payload()})).status,403);assert.equal(s.calls.generate,0);
});
test('AN07 응답 유실/저장 실패/조작 인용은 불확정 중단·재호출 없음',async()=>{
  for(const options of [{generateError:true},{rpcError:'complete'},{output:{...output,evidence:[{sourceId:SOURCE,quote:'存在しない引用の捏造'}]}}]){
    const s=setup(options),p=payload(),r=await s.send({operation:'profile',payload:p});assert.equal(r.status,502);assert.ok(!(await r.text()).includes('secret-must-not-leak'));
    assert.equal(s.jobs.get(p.id).state,'uncertain');await s.send({operation:'profile',payload:p});assert.equal(s.calls.generate,1);
  }
});
test('AN08 타인/만료 자료·변경된 프로필을 AI 호출 전에 거절',async()=>{
  for(const code of ['BNC_ANALYSIS_SOURCE_UNAVAILABLE','BNC_ANALYSIS_STALE_PROFILE']){
    const s=setup({rpcError:'prepare',errorCode:code});assert.equal((await s.send({operation:'profile',payload:payload()})).status,code.endsWith('STALE_PROFILE')?409:400);assert.equal(s.calls.generate,0);
  }
});
test('AN09 후보는 허락한 본문3~5건·중복/요약/외부URL 거절',()=>{
  const candidate={id:randomUUID(),provider:'gemini',model:'gemini-3.7-flash',externalAiConfirmed:true,profileId:randomUUID(),profileRevision:1,rightsConfirmed:true,
    posts:[1,2,3].map(i=>({url:`https://blog.naver.com/neighbor/${i}`,title:'캠핑',body:'회원이 제공한 허락받은 본문',rightsConfirmed:true}))};
  assert.equal(generation('candidates',candidate).input.posts.length,3);
  for(const patch of [{posts:candidate.posts.slice(1)},{rightsConfirmed:false},{posts:[...candidate.posts,candidate.posts[0]]},{posts:candidate.posts.map(p=>({...p,url:'https://example.com/123'}))}])assert.throws(()=>generation('candidates',{...candidate,...patch}));
});
test('AN10 후보 주제점수와 미확인 활동/관계 구분·타블로그 인용 차단',()=>{
  const posts=[1,2,3].map(i=>({...post,id:randomUUID(),blogId:'neighbor',postId:String(i)}));
  const bundle={kind:'candidates',posts,input:{},profile:{},expiresAt:'2026-11-01T00:00:00Z'};
  const v={candidates:[{blogId:'neighbor',topicScore:80,reasons:['캠핑 주제 일치'],evidence:[{sourceId:posts[0].id,quote:'안전하게 준비하는 캠핑'}]}]};
  const result=validateResult(v,bundle).candidates[0];assert.equal(result.relationship,'unknown');assert.equal(result.activity,'unverified');assert.equal(result.overallScore,null);
  v.candidates[0].evidence[0].sourceId=SOURCE;assert.throws(()=>validateResult(v,bundle));
});
test('AN11 3공급자 고정URL/헤더·단일호출·JSON응답',async()=>{
  for(const provider of ['openai','anthropic','gemini']){
    let calls=0;
    const fake=async(url,init)=>{calls++;assert.equal(init.redirect,'error');assert.ok(init.signal);assert.ok(!url.includes('fixture-not-a-secret'));
      assert.ok(!init.body.includes('fixture-not-a-secret'));
      const expected={openai:'https://api.openai.com/v1/chat/completions',anthropic:'https://api.anthropic.com/v1/messages',gemini:'https://generativelanguage.googleapis.com/v1beta/models/fixture-model:generateContent'};
      assert.equal(url,expected[provider]);
      if(provider==='openai')assert.equal(init.headers.authorization,'Bearer fixture-not-a-secret');
      else if(provider==='anthropic'){assert.equal(init.headers['x-api-key'],'fixture-not-a-secret');assert.equal(init.headers['anthropic-version'],'2023-06-01');}
      else assert.equal(init.headers['x-goog-api-key'],'fixture-not-a-secret');
      const body=JSON.parse(init.body);if(provider==='openai'){assert.ok(body.max_completion_tokens>=4000);assert.equal(body.temperature,undefined);}
      const json=provider==='openai'?{choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}]}:provider==='anthropic'?{stop_reason:'end_turn',content:[{type:'text',text:'{"ok":true}'}]}:{candidates:[{finishReason:'STOP',content:{parts:[{text:'{"ok":true}'}]}}]};return Response.json(json);};
    assert.deepEqual(await generateJson(provider,provider==='openai'?'gpt-5.6-luna':'fixture-model','fixture-not-a-secret','system','data',fake),{ok:true});assert.equal(calls,1);
  }
});
test('AN12 공급자 오류는 응답본문/키 노출 없이 재시도 없음',async()=>{
  let calls=0;await assert.rejects(()=>generateJson('openai','gpt-5.6-luna','fixture','s','u',async()=>{calls++;return new Response('fixture-private-response',{status:429});}),e=>!e.message.includes('fixture-private-response'));assert.equal(calls,1);
});
test('AN13 생성 중 회원 정지시 결과는 보관하되 응답으로 노출하지 않음',async()=>{
  const s=setup({revokedAfterCall:true}),p=payload(),r=await s.send({operation:'profile',payload:p});
  assert.equal(r.status,403);assert.equal(s.jobs.get(p.id).state,'succeeded');assert.equal(s.calls.generate,1);
  assert.ok(!(await r.text()).includes('캠핑 준비'));
});
test('AN14 토큰상한으로 잘린 응답·과대 공급자응답 거절',async()=>{
  await assert.rejects(()=>generateJson('openai','gpt-5.6-luna','fixture','s','u',async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]})),/Incomplete/);
  await assert.rejects(()=>generateJson('gemini','fixture-model','fixture','s','u',async()=>new Response('a'.repeat(262145))),/too large/);
});
test('AN15 내부 선점/완료/정리 작업을 회원 HTTP에 노출하지 않음',async()=>{
  for(const operation of ['claim','complete','uncertain','cleanup']){
    const s=setup();assert.equal((await s.send({operation,payload:{}})).status,400);assert.equal(s.calls.rpc.length,0);
  }
});
test('AN16 대기 작업 취소는 회원 작업ID만 전달·키/AI 호출 없음',async()=>{
  const s=setup(),id=randomUUID();assert.equal((await s.send({operation:'cancel',payload:{id}})).status,200);
  assert.deepEqual(s.calls.rpc,['cancel']);assert.deepEqual(s.calls.key,[]);assert.equal(s.calls.generate,0);
  assert.equal((await s.send({operation:'cancel',payload:{id,userId:randomUUID()}})).status,400);
});
