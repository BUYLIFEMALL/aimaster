import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {prepareMessage,validateMessage,messagePrompt} from '../src/lib/messages/contracts.ts';
import {createMessageHandler} from '../src/lib/messages/api.ts';
const source=randomUUID(),user=randomUUID();
const input=()=>({id:randomUUID(),kind:'comment',provider:'anthropic',model:'claude-haiku-4-5',profileId:randomUUID(),profileRevision:1,accountId:randomUUID(),post:{url:'https://blog.naver.com/neighbor/123',title:'캠핑 준비',body:'비를 막는 방수 덮개와 가벼운 접이식 의자를 준비하는 과정에 대한 전체 글입니다.'},facts:[],rightsConfirmed:true,externalAiConfirmed:true});
const bundle={id:randomUUID(),kind:'comment',input:{facts:[]},profile:{},posts:[{id:source,title:'캠핑',body:input().post.body}],previousTexts:[],expiresAt:new Date(Date.now()+60000).toISOString()};
const output=()=>({text:'방수 덮개와 접이식 의자를 함께 준비하는 과정이 구체적으로 담겨 있어 짐을 챙길 때 참고하기 좋겠어요.',summary:'캠핑 준비 과정',emotion:'차분함',questionNeeded:false,aiLikeScore:3,usedFacts:[],details:[{sourceId:source,quote:'비를 막는 방수 덮개'},{sourceId:source,quote:'가벼운 접이식 의자'}]});
test('MSG01 provider-bound model, full body and explicit permissions required',()=>{
 const p=input();assert.equal(prepareMessage(p).input.post.body,p.post.body);
 for(const delta of [{rightsConfirmed:false},{externalAiConfirmed:false},{provider:'openai'},{post:{...p.post,body:'짧음'}},{extra:true}])assert.throws(()=>prepareMessage({...p,...delta}));
 assert.ok(messagePrompt(bundle).user.includes(bundle.posts[0].body));
});
test('MSG02 exact quotes, quality, facts and previous-text duplication are checked',()=>{
 assert.equal(validateMessage(output(),bundle).externalActions,0);
 for(const delta of [{aiLikeScore:7},{details:[{sourceId:source,quote:'원문에 없는 내용입니다'}]},{usedFacts:['방문했습니다']},{text:'좋은 글 감사합니다. 상세히 정리해주셔서 도움이 되었고 다음에도 소통해요.'}])assert.throws(()=>validateMessage({...output(),...delta},bundle));
 assert.throws(()=>validateMessage(output(),{...bundle,previousTexts:[output().text]}));
});
const req=v=>new Request('https://fixture.test/api/messages',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify(v)});
test('MSG03 own key and one generation; reused jobs never call provider again',async()=>{
 let calls=0,done=false;const ops=[];const p=input();
 const handler=createMessageHandler({member:async()=>({allowed:true,userId:user}),key:async(u,provider)=>{assert.equal(u,user);assert.equal(provider,'anthropic');return 'fixture-key';},generate:async(...args)=>{calls++;assert.equal(args[2],'fixture-key');return output();},rpc:async(u,op)=>{ops.push(op);return {data:op==='prepare'?{state:done?'succeeded':'queued'}:op==='claim'?bundle:op==='complete'?(done=true,{}):{id:p.id,state:'succeeded',result:output()},error:null};}});
 assert.equal((await handler(req({operation:'generate',payload:p}))).status,200);
 assert.equal((await handler(req({operation:'generate',payload:p}))).status,200);assert.equal(calls,1);assert.equal(ops.filter(x=>x==='claim').length,1);
});
test('MSG04 denied member, missing key and uncertain provider do not retry',async()=>{
 let calls=0;const ops=[];const deps={member:async()=>({allowed:true,userId:user}),key:async()=>null,generate:async()=>{calls++;throw Error('secret');},rpc:async(u,op)=>{ops.push(op);return {data:op==='prepare'?{state:'queued'}:bundle,error:null};}};
 assert.equal((await createMessageHandler(deps)(req({operation:'generate',payload:input()}))).status,400);assert.equal(calls,0);assert.ok(!ops.includes('claim'));
 const h=createMessageHandler({...deps,key:async()=> 'key'});const r=await h(req({operation:'generate',payload:input()}));assert.equal(r.status,502);assert.equal(calls,1);assert.equal(ops.at(-1),'uncertain');assert.doesNotMatch(await r.text(),/secret/);
 const denied=createMessageHandler({...deps,member:async()=>({allowed:false,status:403,error:'denied'})});assert.equal((await denied(req({operation:'list',payload:{}}))).status,403);
});
