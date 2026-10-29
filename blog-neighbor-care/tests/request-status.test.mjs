import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {buildRequestStatuses,freshRequestObservation} from '../src/lib/execution/requestStatus.ts';
import {checkRequestedRelationship} from '../src/lib/execution/relationshipCheck.ts';
import {createWorkHandler} from '../src/lib/work-api.ts';
const DAY=86400000;
function fixture(){
 const now=Date.now(),user=randomUUID(),account=randomUUID(),device=randomUUID(),id=randomUUID();
 const job={id,user_id:user,account_id:account,actor_id:'owner',neighbor_id:'neighbor',post_id:'',kind:'request',state:'succeeded',generation:1,created_at:new Date(now-10*DAY).toISOString(),expires_at:new Date(now+20*DAY).toISOString()};
 const relation={user_id:user,account_id:account,neighbor_id:'neighbor',state:'pending',verified_at:new Date(now-1000).toISOString()};
 const receipt={user_id:user,job_id:id,generation:1,attempted_at:new Date(now-8*DAY).toISOString(),observed_at:new Date(now-8*DAY+1000).toISOString(),expires_at:job.expires_at,
  proof:{account_id:account,actor_id:'owner',neighbor_id:'neighbor',post_id:'',kind:'request',state:'pending'}};
 const connected={id:account,user_id:user,platform:'naver_blog',external_id:'owner',needs_reconnect:false};
 const scope={memberId:user,jobId:id,accountId:account,deviceId:device,actorId:'owner'},calls=[];
 const snapshot={accountId:account,actorId:'owner',neighborId:'neighbor',checkedAt:now-1000,restriction:'none',relationship:'mutual'};
 const deps={now:()=>now,authorize:async()=>true,connected:async()=>true,permitted:async()=>true,load:async()=>({job,receipt}),
  observe:async(...args)=>{calls.push(['observe',...args]);},stop:async user=>{calls.push(['stop',user]);},
  adapter:{inspect:async()=>{calls.push(['inspect']);return snapshot;},assertCurrent:async()=>true}};
 const status=()=>buildRequestStatuses(user,[job],[relation],[receipt],[connected],now)[0];
 return {now,user,job,relation,receipt,connected,scope,calls,snapshot,deps,status};
}
test('RQ01 acceptance uses exact same-account explicit mutual observation, never infers it from request success',()=>{
 const f=fixture();assert.equal(f.status().state,'pending');f.relation.state='mutual';assert.equal(f.status().state,'accepted');
 f.relation.state='unknown';assert.equal(f.status().state,'unknown');f.relation.state='removed';assert.equal(f.status().state,'removed');
 assert.deepEqual(buildRequestStatuses(f.user,[f.job],[],[f.receipt],[f.connected],f.now)[0].state,'unknown');
});
test('RQ02 7-day cancellation suggestion uses observed request time rather than old draft creation; never cancels',()=>{
 const f=fixture();assert.equal(f.status().cancellationSuggested,true);
 f.receipt.attempted_at=new Date(f.now-DAY).toISOString();f.receipt.observed_at=new Date(f.now-DAY+1000).toISOString();
 assert.equal(f.status().cancellationSuggested,false);assert.equal(f.status().state,'pending');assert.equal(f.calls.length,0);
});
test('RQ03 stale/future/conflicting observations, disconnected accounts and mismatched receipts stay unknown',()=>{
 for(const mutate of [f=>f.relation.verified_at=new Date(f.now-300000).toISOString(),f=>f.relation.verified_at=new Date(f.now+1).toISOString(),
  f=>f.relation.user_id=randomUUID(),f=>f.relation.account_id=randomUUID(),f=>f.receipt.proof.neighbor_id='other',f=>f.receipt.generation=2,
  f=>f.receipt.proof.state='mutual',f=>f.connected.needs_reconnect=true,f=>f.connected.external_id='other',f=>f.job.state='uncertain']){
  const f=fixture();mutate(f);assert.equal(f.status().state,'unknown');assert.equal(f.status().cancellationSuggested,false);
 }
 const f=fixture();assert.equal(buildRequestStatuses(f.user,[f.job],[f.relation,{...f.relation}],[f.receipt],[f.connected],f.now)[0].state,'unknown');
 assert.equal(freshRequestObservation(new Date(f.now-299999).toISOString(),f.now),true);
 assert.equal(freshRequestObservation('bad',f.now),false);
});
test('RQ04 pending/unconfirmed writes never become accepted; expired or foreign jobs are omitted',()=>{
 const f=fixture();f.relation.state='mutual';for(const state of ['draft','ready','claimed','skipped','failed_no_effect']){f.job.state=state;assert.equal(f.status().state,'not_requested');}
 f.job.state='armed';assert.equal(f.status().state,'unknown');f.job.expires_at=new Date(f.now).toISOString();assert.equal(buildRequestStatuses(f.user,[f.job],[],[],[],f.now).length,0);
 const g=fixture();g.job.user_id=randomUUID();assert.equal(buildRequestStatuses(g.user,[g.job],[],[],[],g.now).length,0);
});
test('RQ05 private acceptance reader inspects once, rechecks context, records only relationship and never registers an action',async()=>{
 const f=fixture(),result=await checkRequestedRelationship(f.scope,f.deps);
 assert.equal(result.status,'observed');assert.equal(result.relationship,'mutual');assert.equal(result.externalActions,0);
 assert.deepEqual(f.calls,[['inspect'],['observe',f.user,f.job.id,'mutual']]);
});
test('RQ06 missing permission/connection/receipt prevents inspection; context changes and unknown relationships prevent persistence',async()=>{
 for(const mode of ['access','device','policy','receipt']){
  const f=fixture();if(mode==='access')f.deps.authorize=async()=>false;if(mode==='device')f.deps.connected=async()=>false;
  if(mode==='policy')f.deps.permitted=async()=>false;if(mode==='receipt')f.receipt.proof.account_id=randomUUID();
  assert.equal((await checkRequestedRelationship(f.scope,f.deps)).status,'blocked');assert.equal(f.calls.length,0);
 }
 for(const mode of ['identity','stale','unknown','changed']){
  const f=fixture();if(mode==='identity')f.snapshot.actorId='other';if(mode==='stale')f.snapshot.checkedAt=f.now-30000;
  if(mode==='unknown')f.snapshot.relationship='unknown';if(mode==='changed')f.deps.adapter.assertCurrent=async()=>false;
  assert.equal((await checkRequestedRelationship(f.scope,f.deps)).status,'blocked');assert.equal(f.calls.some(c=>c[0]==='observe'),false);
 }
});
test('RQ07 platform restriction stops the member, while a lost observation response never repeats the read',async()=>{
 const f=fixture();f.snapshot.restriction='captcha';assert.equal((await checkRequestedRelationship(f.scope,f.deps)).reason,'platform_restricted');assert.deepEqual(f.calls,[['inspect'],['stop',f.user]]);
 const g=fixture();g.deps.observe=async()=>{g.calls.push(['observe']);throw Error('lost response');};assert.equal((await checkRequestedRelationship(g.scope,g.deps)).reason,'relationship_check_unconfirmed');assert.deepEqual(g.calls,[['inspect'],['observe']]);
});
test('RQ08 member status endpoint cannot trigger platform reads, forge another user or report acceptance',async()=>{
 const calls=[],handler=createWorkHandler({authorize:async()=>({allowed:true,userId:'owner'}),execute:async(...args)=>{calls.push(args);return {data:{requests:[],externalActions:0},error:null};}});
 const send=(operation,payload={})=>handler(new Request('https://fixture.test/api/work',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify({operation,payload})}));
 assert.equal((await send('request_status')).status,200);assert.deepEqual(calls,[['owner','request_status',{}]]);
 for(const payload of [{user_id:'victim'},{state:'mutual'},{observe:true}])assert.equal((await send('request_status',payload)).status,400);
 assert.equal((await send('observe_relationship')).status,403);assert.equal(calls.length,1);
});
