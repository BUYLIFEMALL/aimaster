import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {issueWorkerTicket} from '../src/lib/execution/workerTicket.ts';
import {runScheduledWork} from '../src/lib/execution/scheduledWork.ts';
function fixture(){
 const secret='fixture-only-scheduler-secret-32bytes',now=Date.now();
 const binding={memberId:randomUUID(),jobId:randomUUID(),deviceId:randomUUID(),accountId:randomUUID(),actorId:'fixture',bodyHash:'a'.repeat(64),approvalRevision:1,generation:1};
 const ticket=issueWorkerTicket(binding,secret,now),calls=[];
 const cursor={acquired:true,user_id:binding.memberId,job_id:binding.jobId,device_id:binding.deviceId,state:'running',run_id:randomUUID(),generation:5};
 const success={status:'succeeded',reason:'verified',externalAttempted:true,reportStored:true};
 const d={secret:()=>secret,now:()=>now,authorize:async id=>({allowed:true,userId:id}),
  tick:async(id,op,p)=>{calls.push({id,op,p});return op==='begin'?cursor:{...cursor,state:'idle',last_result:'succeeded'};},
  execute:async()=>{calls.push('execute');return success;}};
 return {ticket,binding,cursor,d,calls,success};
}
test('SW01 invalid ticket or denied/mismatched member never touches cursor or executes',async()=>{
 for(const mode of ['ticket','denied','other']){
  const f=fixture();if(mode!=='ticket')f.d.authorize=async()=>({allowed:mode==='other',userId:randomUUID()});
  assert.equal((await runScheduledWork(mode==='ticket'?'bad':f.ticket,{preferences:1,settings:1},f.d)).status,'blocked');assert.equal(f.calls.length,0);
 }
});
test('SW02 only an exact committed cursor runs once and settles with its own generation',async()=>{
 const f=fixture();assert.deepEqual(await runScheduledWork(f.ticket,{preferences:2,settings:1},f.d),f.success);
 assert.deepEqual(f.calls.map(x=>typeof x==='string'?x:x.op),['begin','execute','finish']);
 assert.deepEqual(f.calls[0].p,{job_id:f.binding.jobId,device_id:f.binding.deviceId,preference_revision:2,settings_revision:1});
 assert.deepEqual(f.calls[2].p,{run_id:f.cursor.run_id,generation:5,blocked:false});
});
test('SW03 busy/not-due or a lost begin response never executes or retries',async()=>{
 for(const mode of ['busy','throw','otherjob','othermember','otherdevice','invalidrun']){
  const f=fixture();f.d.tick=async()=>{
   if(mode==='throw')throw Error('lost response');if(mode==='busy')return {acquired:false,reason:'busy'};
   return {...f.cursor,...({otherjob:{job_id:randomUUID()},othermember:{user_id:randomUUID()},otherdevice:{device_id:randomUUID()},invalidrun:{run_id:'bad'}}[mode])};
  };
  assert.equal((await runScheduledWork(f.ticket,{preferences:1,settings:1},f.d)).status,'blocked');assert.equal(f.calls.length,0);
 }
});
test('SW04 lost execution or settlement stays uncertain without repeating action or RPC',async()=>{
 for(const mode of ['execute','finish']){
  const f=fixture(),tick=f.d.tick;
  if(mode==='execute')f.d.execute=async()=>{f.calls.push('execute');throw Error('lost result');};
  f.d.tick=async(id,op,p)=>{if(op==='finish'){f.calls.push({id,op,p});throw Error('lost settlement');}return tick(id,op,p);};
  const r=await runScheduledWork(f.ticket,{preferences:1,settings:1},f.d);
  assert.equal(r.status,'uncertain');assert.equal(r.externalAttempted,true);assert.deepEqual(f.calls.map(x=>typeof x==='string'?x:x.op),['begin','execute','finish']);
 }
});
test('SW05 blocked work settles as blocked only with a matching DB checkpoint',async()=>{
 const f=fixture(),tick=f.d.tick;
 f.d.execute=async()=>({status:'blocked',reason:'policy',externalAttempted:false,reportStored:false});
 f.d.tick=async(id,op,p)=>op==='begin'?tick(id,op,p):({...f.cursor,state:'idle',last_result:'blocked'});
 assert.equal((await runScheduledWork(f.ticket,{preferences:1,settings:1},f.d)).status,'blocked');
 f.d.tick=async(id,op,p)=>op==='begin'?tick(id,op,p):({...f.cursor,state:'paused',last_result:'uncertain'});
 assert.equal((await runScheduledWork(f.ticket,{preferences:1,settings:1},f.d)).status,'uncertain');
});
