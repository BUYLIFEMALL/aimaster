import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {issueWorkerTicket,verifyWorkerTicket} from '../src/lib/execution/workerTicket.ts';
import {runTicketedWork} from '../src/lib/execution/trustedHost.ts';
const secret='fixture-worker-secret-only-no-production-use';
const memberId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',deviceId='33333333-3333-4333-8333-333333333333',accountId='44444444-4444-4444-8444-444444444444';
const binding={memberId,jobId,deviceId,accountId,actorId:'own-blog',bodyHash:createHash('sha256').update('합성 문장').digest('hex'),approvalRevision:1,generation:1};
const sign=v=>{const p=Buffer.from(JSON.stringify(v)).toString('base64url');return `bncw1.${p}.${createHmac('sha256',secret).update(`bncw1.${p}`).digest('hex')}`;};
test('WT01 ticket binds exact job/account/device/body/revision/generation and expires after sixty seconds',()=>{
 const t=issueWorkerTicket(binding,secret,1000),v=verifyWorkerTicket(t,secret,1000);assert.equal(v.jobId,jobId);assert.equal(v.expiresAt,61000);assert.equal(v.bodyHash,binding.bodyHash);assert.equal(verifyWorkerTicket(t,secret,61000),null);
 assert.equal(verifyWorkerTicket(t,secret+'wrong',1000),null);assert.equal(verifyWorkerTicket('a'.repeat(64),secret,1000),null);assert.equal(verifyWorkerTicket(t,undefined,1000),null);
});
test('WT02 tampering, extra fields, invalid scope and signed excessive lifetime all fail closed',()=>{
 const t=issueWorkerTicket(binding,secret,1000),v=verifyWorkerTicket(t,secret,1000);
 for(const changed of [{...v,expiresAt:61001},{...v,memberId:'victim'},{...v,approvalRevision:0},{...v,generation:0},{...v,extra:true},{...v,issuedAt:1001}])assert.equal(verifyWorkerTicket(sign(changed),secret,1000),null);
 const parts=t.split('.');parts[1]=Buffer.from(JSON.stringify({...v,jobId:accountId})).toString('base64url');assert.equal(verifyWorkerTicket(parts.join('.'),secret,1000),null);
 assert.equal(verifyWorkerTicket('x'.repeat(2049),secret,1000),null);assert.throws(()=>issueWorkerTicket(binding,'short',1000));
});
function fixture(){
 const state={now:Date.now(),member:true,connected:true,policy:true,applied:0,calls:[],stored:null};
 state.job={id:jobId,user_id:memberId,account_id:accountId,actor_id:'own-blog',neighbor_id:'fixture-target',post_id:'123',kind:'comment',body:'합성 문장',expires_at:new Date(state.now+60000).toISOString(),state:'ready',approval_revision:1,generation:0};
 const context=()=>({accountId,actorId:'own-blog',neighborId:'fixture-target',postId:'123',checkedAt:state.now});
 const until=new Date(state.now+30000).toISOString();
 const d={secret:()=>secret,now:()=>state.now,store:{member:async id=>({allowed:state.member,userId:id}),connected:async()=>state.connected,load:async()=>state.job,permitted:async()=>state.policy,
  rpc:async(user,op,p)=>{state.calls.push(op);assert.equal(user,memberId);assert.equal(p.id,jobId);if(op==='claim'){state.job={...state.job,state:'claimed',device_id:deviceId,generation:1};}if(op==='arm')state.job={...state.job,state:'armed',permit_until:until};if(op==='verify_permit')return {valid:true,id:jobId,permit_until:until};return state.job;},
  result:async(user,p)=>{assert.equal(user,memberId);state.stored=p;state.job={...state.job,state:p.outcome==='success'?'succeeded':'uncertain'};return state.job;}
 },adapter:{inspect:async()=>({...context(),restriction:'none',relationship:'mutual',liked:false,duplicate:false}),assertCurrent:async()=>true,apply:async()=>{state.applied++;},verify:async()=>({...context(),state:'commented',bodyHash:binding.bodyHash,effectId:'fixture-comment'})}};
 const t=issueWorkerTicket(binding,secret,state.now);return {state,d,t,run:()=>runTicketedWork(t,d)};
}
test('WT03 valid ticket settles minimal effect metadata through private result store, no body/credentials',async()=>{
 const f=fixture(),r=await f.run();assert.equal(r.status,'succeeded');assert.equal(f.state.applied,1);assert.equal(f.state.stored.evidence.effect_id,'fixture-comment');assert.equal(f.state.stored.evidence.body_hash,binding.bodyHash);assert.doesNotMatch(JSON.stringify(f.state.stored),/合成|합성 문장|fixture-worker-secret|token/);
 assert.equal((await f.run()).status,'blocked');assert.equal(f.state.applied,1);
});
test('WT04 reader token, revoked device, lost member access or missing platform allowance never apply',async()=>{
 const invalid=fixture();assert.equal((await runTicketedWork('a'.repeat(64),invalid.d)).status,'blocked');assert.equal(invalid.state.calls.length,0);
 for(const flag of ['connected','member','policy']){const f=fixture();f.state[flag]=false;assert.equal((await f.run()).status,'blocked');assert.equal(f.state.applied,0);}
});
test('WT05 account/body/approval/generation changes invalidate an earlier ticket before claiming',async()=>{
 for(const patch of [{account_id:deviceId},{body:'다른 합성 문장'},{approval_revision:2},{generation:1}]){const f=fixture();Object.assign(f.state.job,patch);assert.equal((await f.run()).status,'blocked');assert.equal(f.state.calls.length,0);assert.equal(f.state.applied,0);}
});
test('WT06 device revoked after claim or unexpected claim generation cannot reach arm',async()=>{
 for(const change of ['device','generation']){const f=fixture(),rpc=f.d.store.rpc;f.d.store.rpc=async(...args)=>{const r=await rpc(...args);if(args[1]==='claim'){if(change==='device')f.state.connected=false;else return {...r,generation:2};}return r;};assert.equal((await f.run()).status,'blocked');assert.equal(f.state.calls.includes('arm'),false);assert.equal(f.state.applied,0);}
});
