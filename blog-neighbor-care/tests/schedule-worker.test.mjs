import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createScheduleWorker} from '../src/lib/execution/scheduleWorker.ts';
import {verifyWorkerTicket} from '../src/lib/execution/workerTicket.ts';
function fixture(){
 const binding={memberId:randomUUID(),accountId:randomUUID(),deviceId:randomUUID(),actorId:'fixture-owner'},secret='fixture-worker-secret-32characters',now=Date.now(),calls=[];
 const context={memberId:binding.memberId,allowed:true,connected:true,enabled:true,liveAllowed:true,settingsRevision:2,preferenceRevision:3,policyKinds:['comment']};
 const job={id:randomUUID(),user_id:binding.memberId,account_id:binding.accountId,actor_id:binding.actorId,state:'ready',approval_revision:2,approval_hash:'a'.repeat(64),kind:'comment',body:'fixture private text',expires_at:new Date(now+600000).toISOString(),generation:5};
 const d={secret:()=>secret,now:()=>now,context:async()=>{calls.push('context');return context;},jobs:async()=>{calls.push('jobs');return [job];},
  dispatch:async(ticket,revisions)=>{calls.push({ticket,revisions});return {status:'succeeded',reason:'effect_verified',externalAttempted:true,reportStored:true};},wait:async()=>{calls.push('wait');}};
 return {binding,secret,now,context,job,d,calls};
}
test('WK01 missing secret/identity and revoked member/device/settings/live/policy never read job bodies or dispatch',async()=>{
 for(const mode of ['secret','identity','member','access','device','enabled','live','policy']){
  const f=fixture();if(mode==='secret')f.d.secret=()=>undefined;if(mode==='identity')f.binding.deviceId='bad';
  if(mode==='member')f.context.memberId=randomUUID();if(mode==='access')f.context.allowed=false;if(mode==='device')f.context.connected=false;
  if(mode==='enabled')f.context.enabled=false;if(mode==='live')f.context.liveAllowed=false;if(mode==='policy')f.context.policyKinds=[];
  assert.equal((await createScheduleWorker(f.binding,f.d).poll()).status,'blocked');assert.equal(f.calls.includes('jobs'),false);assert.equal(f.calls.some(c=>typeof c==='object'),false);
 }
});
test('WK02 only same-member/account/actor approved unexpired supported jobs produce an exact one-job ticket',async()=>{
 for(const patch of [{user_id:randomUUID()},{account_id:randomUUID()},{actor_id:'other'},{state:'draft'},{state:'armed'},{approval_revision:1},{approval_hash:null},{kind:'reply'},{expires_at:'invalid'},{expires_at:'2020-01-01'},{generation:-1}]){
  const f=fixture();Object.assign(f.job,patch);assert.equal((await createScheduleWorker(f.binding,f.d).poll()).reason,'no_approved_work');assert.equal(f.calls.some(c=>typeof c==='object'),false);
 }
 const f=fixture();assert.equal((await createScheduleWorker(f.binding,f.d).poll()).status,'succeeded');
 const dispatch=f.calls.find(c=>typeof c==='object'),ticket=verifyWorkerTicket(dispatch.ticket,f.secret,f.now);
 assert.equal(ticket.memberId,f.binding.memberId);assert.equal(ticket.jobId,f.job.id);assert.equal(ticket.generation,6);assert.equal(ticket.deviceId,f.binding.deviceId);
 assert.deepEqual(dispatch.revisions,{preferences:3,settings:2});assert.equal(JSON.stringify(ticket).includes(f.job.body),false);
});
test('WK03 overlapping local polls cannot dispatch twice while a durable run is in flight',async()=>{
 const f=fixture();let release;f.d.dispatch=async()=>new Promise(resolve=>release=resolve);const w=createScheduleWorker(f.binding,f.d),first=w.poll();
 await new Promise(r=>setImmediate(r));assert.equal((await w.poll()).reason,'worker_busy');release({status:'succeeded',reason:'verified',externalAttempted:true,reportStored:true});assert.equal((await first).status,'succeeded');
});
test('WK04 lost/uncertain dispatch stops the bounded loop without waiting or automatic retry',async()=>{
 for(const mode of ['throw','uncertain','invalid']){
  const f=fixture();let count=0;f.d.dispatch=async()=>{count++;if(mode==='throw')throw Error('lost response');return mode==='invalid'?{status:'succeeded',externalAttempted:true,reportStored:false}:{status:'uncertain',reason:'effect_unconfirmed',externalAttempted:true,reportStored:true};};
  const r=await createScheduleWorker(f.binding,f.d).run({signal:new AbortController().signal,cycles:5});
  assert.equal(r.length,1);assert.equal(r[0].status,'uncertain');assert.equal(count,1);assert.equal(f.calls.includes('wait'),false);
 }
});
test('WK05 abort before/during setup prevents dispatch; bound source cannot be changed by the caller',async()=>{
 const f=fixture(),signal=new AbortController(),w=createScheduleWorker(f.binding,f.d);signal.abort();assert.equal((await w.poll(signal.signal)).reason,'worker_stopped');assert.equal(f.calls.length,0);
 const g=fixture(),stop=new AbortController();g.d.jobs=async()=>{stop.abort();return [g.job];};assert.equal((await createScheduleWorker(g.binding,g.d).poll(stop.signal)).reason,'worker_stopped');assert.equal(g.calls.some(c=>typeof c==='object'),false);
 const h=fixture(),worker=createScheduleWorker(h.binding,h.d);h.binding.actorId='mutated';assert.equal((await worker.poll()).status,'succeeded');
});
test('WK06 timer bounds are enforced and every iteration rechecks access rather than caching permission',async()=>{
 const f=fixture(),w=createScheduleWorker(f.binding,f.d),signal=new AbortController().signal;
 for(const options of [{cycles:0},{cycles:121},{cycles:1,intervalMs:1000}])await assert.rejects(()=>w.run({signal,...options}));
 let contexts=0;f.d.context=async()=>({...f.context,allowed:++contexts===1});
 const results=await w.run({signal,cycles:3});assert.equal(contexts,3);assert.equal(results[0].status,'succeeded');assert.equal(results[1].reason,'worker_not_permitted');assert.equal(f.calls.filter(c=>typeof c==='object').length,1);
});
