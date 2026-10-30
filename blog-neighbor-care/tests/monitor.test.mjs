import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createMonitorHandler,monitorQuotes,reserveEstimate} from '../src/lib/neighbors/monitor.ts';
const user=randomUUID(),session=randomUUID(),account=randomUUID(),target=randomUUID(),profile=randomUUID(),workId=randomUUID(),source=randomUUID();
const body='비를 막는 방수 덮개와 가벼운 접이식 의자를 준비하는 과정에 대한 전체 글입니다.';
const prices=JSON.stringify([{provider:'anthropic',model:'claude-haiku-4-5',inputUsdPerMillion:1,outputUsdPerMillion:5,validUntil:'2099-01-01T00:00:00Z',reference:'https://fixture.test/reviewed-price'}]);
const req=(operation,payload={},headers={})=>new Request('https://fixture.test/api/neighbors/monitor',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json',...headers},body:JSON.stringify({operation,payload})});
function fixture(phase='ai'){
 const calls=[],s={paid:0,feeds:0,done:false,lose:false,budget:false,key:'own-fixture-key'};
 const work={id:session,work_id:workId,generation:1,phase,account_id:account,target_id:target,neighbor_id:'neighbor',profile_id:profile,profile_revision:1,provider:'anthropic',model:'claude-haiku-4-5',quote_hash:monitorQuotes(prices)[0].hash};
 const d={member:async()=>({allowed:true,userId:user}),key:async(u,p)=>{calls.push('key');assert.equal(u,user);assert.equal(p,'anthropic');return s.key;},feedEnabled:()=>true,aiEnabled:()=>true,prices:()=>prices,
  fetcher:async(url)=>{s.feeds++;assert.equal(url,'https://rss.blog.naver.com/neighbor.xml');return new Response('<rss><channel><item><title>제목</title><link>https://blog.naver.com/neighbor/123</link><description>excerpt is never presumed full</description></item></channel></rss>');},
  generate:async(p,m,k)=>{calls.push('generate');s.paid++;assert.equal(k,'own-fixture-key');if(s.lose)throw Error('secret-provider-error');return {text:'방수 덮개와 접이식 의자를 함께 준비하는 과정이 구체적으로 담겨 있어 짐을 챙길 때 참고하기 좋겠어요.',summary:'캠핑 준비 과정',emotion:'차분함',questionNeeded:false,aiLikeScore:3,usedFacts:[],details:[{sourceId:source,quote:'비를 막는 방수 덮개'},{sourceId:source,quote:'가벼운 접이식 의자'}]};},
  rpc:async(u,ns,op,p)=>{assert.equal(u,user);calls.push(`${ns}:${op}`);let data={};if(op==='claim')data=s.done?{phase:'idle'}:work;if(op==='material')data={url:'https://blog.naver.com/neighbor/123',title:'캠핑',body,expiresAt:'2099-01-01T00:00:00Z'};if(ns==='analysis')data={reviewedProfile:{}};if(op==='reserve_ai'){assert.ok(p.amountMicros>30000);data=s.budget?{phase:'budget'}:{id:workId,phase:'ai',kind:'comment',input:{facts:[]},profile:{},posts:[{id:source,title:'캠핑',body}],previousTexts:[],expiresAt:'2099-01-01T00:00:00Z'};}if(op==='feed_complete'){assert.equal(p.posts[0].body,'');s.done=true;}if(op==='ai_complete')s.done=true;if(op==='status')data={monitor:{state:'active'},awaitingBody:0};return {data,error:null};},
 };return {d,s,calls,handler:createMonitorHandler(d)};
}
test('MON01 expired/unreviewed/mismatched prices never enable a quote; estimate includes full UTF-8 prompt and output cap',()=>{
 assert.equal(monitorQuotes(prices).length,1);assert.equal(monitorQuotes(prices,Date.parse('2100-01-01')).length,0);assert.equal(monitorQuotes(prices.replace('https://fixture','http://fixture')).length,0);
 assert.equal(monitorQuotes(prices.replace('claude-haiku-4-5','unlisted')).length,0);assert.ok(reserveEstimate(monitorQuotes(prices)[0],{system:'한글',user:'본문'})>=38000);assert.throws(()=>reserveEstimate(monitorQuotes(prices)[0],{system:'a',user:'b'.repeat(100001)}));
});
test('MON02 member/origin/strict operation/start consent gates reject before feed, key or AI access',async()=>{
 const f=fixture();assert.equal((await f.handler(req('tick',{sessionId:session},{origin:'https://evil.test'}))).status,403);assert.equal((await f.handler(req('reserve_ai',{}))).status,400);assert.equal((await f.handler(req('tick',{sessionId:session,user_id:'other'}))).status,400);
 assert.equal((await f.handler(req('start',{accountId:account,neighbors:['neighbor'],aiEnabled:false,expectedRevision:0,feedConsent:false,confirmed:true,budgetMicros:0,maxAi:0}))).status,400);assert.equal(f.s.paid,0);assert.equal(f.s.feeds,0);assert.equal(f.calls.length,0);
});
test('MON03 feed tick fetches only fixed publisher URL, stores metadata only and never calls an AI',async()=>{
 const f=fixture('feed');assert.equal((await f.handler(req('tick',{sessionId:session}))).status,200);assert.equal(f.s.feeds,1);assert.equal(f.s.paid,0);assert.ok(f.calls.includes('monitor:feed_complete'));assert.ok(!f.calls.includes('key'));
});
test('MON04 confirmed material uses member key only after reservation; result remains unapproved and repeat tick never regenerates',async()=>{
 const f=fixture();assert.equal((await f.handler(req('tick',{sessionId:session}))).status,200);assert.equal(f.s.paid,1);assert.ok(f.calls.indexOf('monitor:reserve_ai')<f.calls.indexOf('generate'));assert.ok(f.calls.includes('message:complete'));assert.ok(!f.calls.some(c=>/adopt|approve/.test(c)));assert.equal((await f.handler(req('tick',{sessionId:session}))).status,200);assert.equal(f.s.paid,1);
});
test('MON05 budget/key/unknown provider result cannot trigger fallback/retry or expose secrets',async()=>{
 const capped=fixture();capped.s.budget=true;assert.equal((await capped.handler(req('tick',{sessionId:session}))).status,200);assert.equal(capped.s.paid,0);
 const noKey=fixture();noKey.s.key=null;assert.equal((await noKey.handler(req('tick',{sessionId:session}))).status,409);assert.equal(noKey.s.paid,0);
 const failed=fixture();failed.s.lose=true;const r=await failed.handler(req('tick',{sessionId:session}));assert.equal(r.status,409);assert.equal(failed.s.paid,1);assert.ok(failed.calls.includes('message:uncertain'));assert.ok(failed.calls.includes('monitor:fail'));assert.doesNotMatch(await r.text(),/secret-provider|own-fixture-key/);
});
