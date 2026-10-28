import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {executeApprovedWork} from '../src/lib/execution/approvedWork.ts';
const memberId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',deviceId='33333333-3333-4333-8333-333333333333',account='44444444-4444-4444-8444-444444444444';
const input={memberId,jobId,deviceId};
function fixture(kind='comment'){
 const now=Date.parse('2026-10-29T01:00:00Z'),until=new Date(now+30000).toISOString();
 const job={id:jobId,user_id:memberId,account_id:account,actor_id:'own-blog',neighbor_id:'fixture-neighbor',post_id:kind==='request'?'':'123',kind,body:kind==='like'?'':'검수 전용 문장',expires_at:new Date(now+60000).toISOString(),state:'ready'};
 const state={now,auth:true,allowed:true,applyCount:0,observations:0,job:{...job},effectState:kind==='request'?'pending':kind==='like'?'liked':'commented',calls:[]};
 const context=()=>({accountId:account,actorId:'own-blog',neighborId:'fixture-neighbor',postId:job.post_id,checkedAt:state.now});
 const observation=()=>({...context(),restriction:'none',relationship:kind==='request'?'none':'mutual',liked:false,duplicate:false});
 const deps={now:()=>state.now,authorize:async()=>state.auth,permitted:async()=>state.allowed,load:async()=>state.job,rpc:async(user,op,p)=>{
  assert.equal(user,memberId);state.calls.push({op,p});if(state.fail===op)throw Error('secret provider detail');
  if(op==='observe')return {...state.job};if(op==='configure'){state.disabled=true;return {enabled:false};}
  if(op==='claim'){state.job={...state.job,state:'claimed',device_id:deviceId,generation:1};return {...state.job};}
  if(op==='arm'){state.job={...state.job,state:'armed',permit_until:until};return {...state.job};}
  if(op==='verify_permit')return {valid:true,id:jobId,permit_until:until};
  if(op==='result'){state.job={...state.job,state:p.outcome==='success'?'succeeded':'uncertain'};return {...state.job};}
  throw Error('unexpected operation');
 },adapter:{inspect:async()=>{state.observations++;return observation();},assertCurrent:async()=>true,apply:async(j,permit)=>{
  state.applyCount++;assert.equal(j.body,job.body);assert.equal(Object.isFrozen(j),true);assert.equal(permit.validUntil,until);if(state.applyThrows)throw Error('private raw response');
 },verify:async()=>({...context(),state:state.effectState,bodyHash:createHash('sha256').update(job.body).digest('hex'),effectId:'fixture-comment-1'})}};
 return {deps,state,job,context,observation,run:()=>executeApprovedWork(input,deps)};
}
test('EX01 request, like and comment verify exact effect after one permit and one application',async()=>{
 for(const kind of ['request','like','comment']){const f=fixture(kind),r=await f.run();assert.equal(r.status,'succeeded');assert.equal(f.state.applyCount,1);assert.deepEqual(f.state.calls.map(c=>c.op),['observe','claim','observe','arm','verify_permit','result']);assert.equal(f.state.calls.at(-1).p.verified,true);assert.doesNotMatch(JSON.stringify(r),/검수 전용|fixture-neighbor/);}
});
test('EX02 authorization/policy/owner/state/unsupported reply fail before any external application',async()=>{
 for(const edit of [f=>f.state.auth=false,f=>f.state.allowed=false,f=>f.state.job.user_id=account,f=>f.state.job.state='armed',f=>f.state.job.kind='reply',f=>f.state.job={...f.state.job,kind:'request',post_id:'123'}]){const f=fixture();edit(f);assert.equal((await f.run()).status,'blocked');assert.equal(f.state.applyCount,0);assert.equal(f.state.calls.length,0);}
});
test('EX03 unknown relationship, already liked/duplicate, wrong actor/post and stale evidence never claim',async()=>{
 for(const [kind,patch] of [['request',{relationship:'unknown'}],['request',{relationship:'pending'}],['like',{liked:true}],['comment',{duplicate:null}],['comment',{duplicate:true}],['comment',{actorId:'another-blog'}],['comment',{postId:'999'}],['comment',{checkedAt:0}]]){
  const f=fixture(kind);f.deps.adapter.inspect=async()=>({...f.observation(),...patch});assert.equal((await f.run()).status,'blocked');assert.equal(f.state.applyCount,0);assert.equal(f.state.calls.some(c=>c.op==='claim'),false);
 }
});
test('EX04 login/captcha/platform restriction stops member execution before claiming',async()=>{
 for(const restriction of ['login','captcha','platform']){const f=fixture();f.deps.adapter.inspect=async()=>({...f.observation(),restriction});assert.equal((await f.run()).status,'blocked');assert.equal(f.state.disabled,true);assert.equal(f.state.applyCount,0);}
});
test('EX05 changed identity or member authorization after claim cannot arm',async()=>{
 for(const edit of [f=>{f.deps.adapter.inspect=async()=>({...f.observation(),actorId:++f.state.observations===1?'own-blog':'changed'});},f=>{let n=0;f.deps.authorize=async()=>++n===1;}]){
  const f=fixture();edit(f);assert.equal((await f.run()).status,'blocked');assert.equal(f.state.calls.some(c=>c.op==='arm'),false);assert.equal(f.state.applyCount,0);
 }
});
test('EX06 lost arm/permit response or changed final context remains unconfirmed without external click',async()=>{
 for(const edit of [f=>f.state.fail='arm',f=>f.state.fail='verify_permit',f=>f.deps.adapter.assertCurrent=async()=>false,f=>f.deps.adapter.assertCurrent=async()=>{f.state.now+=31000;return true;}]){
  const f=fixture();edit(f);const r=await f.run();assert.equal(r.status,'uncertain');assert.equal(f.state.applyCount,0);assert.equal(f.state.calls.filter(c=>c.op==='result').at(-1).p.verified,false);
 }
});
test('EX07 ambiguous click or wrong comment proof keeps uncertainty, never reports no-effect/refund',async()=>{
 for(const edit of [f=>f.state.applyThrows=true,f=>f.state.effectState='unknown',f=>f.deps.adapter.verify=async()=>({...f.context(),state:'commented',bodyHash:'a'.repeat(64),effectId:'fixture-id'}),f=>f.deps.adapter.verify=async()=>({...f.context(),actorId:'someone-else',state:'commented'})]){
  const f=fixture();edit(f);const r=await f.run();assert.equal(r.status,'uncertain');assert.equal(f.state.applyCount,1);assert.equal(f.state.calls.at(-1).p.outcome,'uncertain');assert.doesNotMatch(JSON.stringify(r),/private raw|secret provider/);
 }
});
test('EX08 lost result report and repeated invocation cannot apply an armed job again',async()=>{
 const f=fixture();f.state.fail='result';const r=await f.run();assert.equal(r.status,'uncertain');assert.equal(r.reportStored,false);assert.equal(f.state.applyCount,1);assert.equal((await f.run()).status,'blocked');assert.equal(f.state.applyCount,1);
});
test('EX09 changed server claim contents or permit timestamp stops before application',async()=>{
 for(const change of ['claim','permit']){const f=fixture(),rpc=f.deps.rpc;f.deps.rpc=async(...args)=>{const r=await rpc(...args);if(args[1]===(change==='claim'?'claim':'verify_permit'))return {...r,...(change==='claim'?{body:'changed'}:{permit_until:new Date(f.state.now+29000).toISOString()})};return r;};assert.notEqual((await f.run()).status,'succeeded');assert.equal(f.state.applyCount,0);}
});
test('EX10 a committed success with lost response is not undone or externally applied again',async()=>{
 const f=fixture(),rpc=f.deps.rpc;let lost=false;
 f.deps.rpc=async(...args)=>{
  if(args[1]==='result'&&f.state.job.state==='succeeded'&&args[2].outcome!=='success')throw Error('terminal success');
  const result=await rpc(...args);if(args[1]==='result'&&args[2].outcome==='success'&&!lost){lost=true;throw Error('lost committed response');}return result;
 };
 const result=await f.run();assert.equal(result.status,'uncertain');assert.equal(result.reportStored,false);
 assert.equal(f.state.job.state,'succeeded');assert.equal((await f.run()).status,'blocked');assert.equal(f.state.applyCount,1);
});
test('EX11 effect evidence collected before this application cannot confirm success',async()=>{
 const f=fixture();f.deps.adapter.verify=async()=>({...f.context(),checkedAt:f.state.now-1,state:'commented',bodyHash:createHash('sha256').update(f.job.body).digest('hex'),effectId:'old-effect'});
 assert.equal((await f.run()).status,'uncertain');assert.equal(f.state.applyCount,1);assert.equal(f.state.calls.at(-1).p.verified,false);
});
