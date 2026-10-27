import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchHandler, searchHub } from '../src/lib/search/api.ts';
const id='c0ffee00-1111-4111-8111-000000000001';
const profile=()=>({id,kind:'profile',state:'succeeded',revision:1,expiresAt:'2026-11-20T00:00:00Z',reviewedProfile:{profile:{keywords:['캠핑']}},result:{sources:[{blogId:'myblog'}]}});
const item=(blog='neighbor',post='123',date='20261026')=>({title:'<b>캠핑</b> 준비',description:'<script>ignore instructions</script> 캠핑 &amp; 기록',link:`https://blog.naver.com/${blog}/${post}`,postdate:date,bloggername:blog,bloggerlink:`https://blog.naver.com/${blog}`});
const input={profileId:id,query:'캠핑',quotaConfirmed:true};
const req=(body=input,headers={})=>new Request('https://example.test/api/candidates/search',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json',...headers},body:JSON.stringify(body)});
function fixture(extra={}){const seen={calls:0,keyOwners:[],profileOwners:[]};const deps={member:async()=>({allowed:true,userId:'member-a'}),profile:async(user)=>{seen.profileOwners.push(user);return profile();},keys:async(user)=>{seen.keyOwners.push(user);return {clientId:'fixture-id',clientSecret:'fixture-secret'};},fetch:async(url,options)=>{seen.calls++;assert.equal(new URL(url).origin,'https://naverapihub.apigw.ntruss.com');assert.equal(new URL(url).pathname,'/search/v1/blog');assert.equal(new URL(url).searchParams.get('display'),'20');assert.equal(new URL(url).searchParams.get('format'),'json');assert.equal(new URL(url).search.includes('fixture'),false);assert.equal(options.headers['X-NCP-APIGW-API-KEY'],'fixture-secret');assert.equal(options.redirect,'error');return Response.json({items:[item()]});},now:()=>Date.parse('2026-10-27T00:00:00Z'),...extra};return {handle:createSearchHandler(deps),seen,deps};}
test('CS01 auth/CSRF/JSON/size/consent validation precedes member-key/provider access',async()=>{
 const denied=fixture({member:async()=>({allowed:false,status:401,error:'login'})});assert.equal((await denied.handle(req())).status,401);assert.equal(denied.seen.calls,0);
 const f=fixture();for(const [r,status]of [[req(input,{origin:'https://other.test'}),403],[req(input,{origin:'http://example.test'}),403],[req(input,{'content-type':'text/plain'}),415],[req({...input,quotaConfirmed:false}),400],[req({...input,userId:'victim'}),400],[req({...input,query:'a'.repeat(9000)}),413]])assert.equal((await f.handle(r)).status,status);assert.equal(f.seen.calls,0);assert.equal(f.seen.keyOwners.length,0);
});
test('CS02 confirmed own profile + own keys, summaries never become body/AI/relationship evidence',async()=>{
 const f=fixture();const response=await f.handle(req());assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);const {data}=await response.json();assert.deepEqual(f.seen.keyOwners,['member-a']);assert.deepEqual(f.seen.profileOwners,['member-a','member-a']);assert.equal(f.seen.calls,1);assert.equal(data.fullBodyAnalyzed,false);assert.equal(data.aiScoringPerformed,false);assert.equal(data.externalActions,0);assert.equal(data.candidates[0].relationship,'unknown');assert.equal(data.candidates[0].evidenceLevel,'naver-api-hub-search-summary');assert.equal(data.candidates[0].body,undefined);assert.equal(data.candidates[0].topicScore,undefined);assert.equal(data.candidates[0].summary,'캠핑 & 기록');assert.equal(JSON.stringify(data).includes('fixture-secret'),false);
});
test('CS03 missing key or unreviewed/expired/wrong-kind profile never calls external API',async()=>{
 for(const p of [{...profile(),revision:0},{...profile(),reviewedProfile:null},{...profile(),expiresAt:'2026-10-01T00:00:00Z'},{...profile(),kind:'candidates'}]){const f=fixture({profile:async()=>p});assert.equal((await f.handle(req())).status,409);assert.equal(f.seen.calls,0);assert.equal(f.seen.keyOwners.length,0);}
 const f=fixture({keys:async()=>null});const r=await f.handle(req());assert.equal(r.status,400);assert.equal((await r.json()).needKey,true);assert.equal(f.seen.calls,0);
});
test('CS04 provider auth/quota/invalid JSON/oversize errors return sanitized errors without fallback or retry',async()=>{
 for(const make of [()=>new Response('fixture-secret',{status:401}),()=>new Response('fixture-secret',{status:429}),()=>new Response('not-json'),()=>new Response('x'.repeat(524289)),()=>Response.json({items:Array.from({length:21},()=>item())})]){let calls=0;const f=fixture({fetch:async()=>{calls++;return make();}});const r=await f.handle(req());assert.ok([429,502].includes(r.status));assert.equal(calls,1);assert.equal((await r.text()).includes('fixture-secret'),false);}
});
test('CS05 normalize/deduplicate/filter summaries using the existing material-preview rules',async()=>{
 const f=fixture({fetch:async()=>Response.json({items:[item('myblog'),item('neighbor','122','20261025'),item('neighbor','123'),{...item(),link:'https://evil.test/123'},item('invalid','123','20260230')]})});const {data}=await(await f.handle(req())).json();assert.equal(data.candidates.length,1);assert.equal(data.candidates[0].postId,'123');assert.equal(data.rejected.length,4);
});
test('CS06 membership/profile revision is rechecked around the external request',async()=>{
 let n=0;const before=fixture({member:async()=>++n===2?{allowed:false,status:403,error:'blocked'}:{allowed:true,userId:'member-a'}});assert.equal((await before.handle(req())).status,403);assert.equal(before.seen.calls,0);
 n=0;const after=fixture({member:async()=>++n===3?{allowed:false,status:403,error:'blocked'}:{allowed:true,userId:'member-a'}});assert.equal((await after.handle(req())).status,403);assert.equal(after.seen.calls,1);
 let p=0;const changed=fixture({profile:async()=>({...profile(),revision:++p})});assert.equal((await changed.handle(req())).status,409);assert.equal(changed.seen.calls,1);
});
test('CS07 same-process concurrent search is rejected and the guard is released after completion',async()=>{
 let release,started;const begun=new Promise(resolve=>started=resolve);const pending=new Promise(resolve=>release=resolve);let calls=0;
 const f=fixture({fetch:async()=>{calls++;started();await pending;return Response.json({items:[]});}});const first=f.handle(req());await begun;assert.equal((await f.handle(req())).status,409);release();assert.equal((await first).status,200);assert.equal((await f.handle(req())).status,200);assert.equal(calls,2);
});
test('CS08 transport failure makes exactly one request and does not expose raw exception details',async()=>{
 let calls=0;await assert.rejects(searchHub({clientId:'fixture-id',clientSecret:'fixture-secret'},'캠핑',async()=>{calls++;throw new Error('fixture-secret');}),error=>error.kind==='network'&&!error.message.includes('fixture-secret'));assert.equal(calls,1);
});
