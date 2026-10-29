import test from 'node:test';
import assert from 'node:assert/strict';
import {captureIncomingComment} from '../src/lib/execution/engagementIntake.ts';
import {createWorkHandler} from '../src/lib/work-api.ts';
const id='11111111-1111-4111-8111-111111111111',scope={memberId:id,accountId:id,deviceId:id,actorId:'own-blog'};
function fixture(){
 const s={allowed:true,connected:true,permitted:true,inspections:0,saves:0,stops:0,current:true};
 const snapshot={accountId:id,actorId:'own-blog',neighborId:'neighbor',ownPostId:'123',commentId:'comment-1',returnPostId:'456',returnPostOwnerId:'neighbor',checkedAt:100000,restriction:'none',parentIsTopLevel:true,alreadyReplied:false};
 const d={now:()=>100000,authorize:async()=>s.allowed,connected:async()=>s.connected,permitted:async()=>s.permitted,
  adapter:{inspect:async()=>{s.inspections++;return snapshot;},assertCurrent:async()=>s.current},save:async()=>{s.saves++;},stop:async()=>{s.stops++;}};
 return {s,snapshot,d,run:()=>captureIncomingComment(scope,d)};
}
test('EN01 trusted intake captures exact own-post incoming comment without any external registration',async()=>{
 const f=fixture();assert.deepEqual(await f.run(),{status:'captured',externalActions:0});assert.equal(f.s.inspections,1);assert.equal(f.s.saves,1);
});
test('EN02 revoked access/connection or absent read permission denies inspection; source/context changes deny storage',async()=>{
 for(const key of ['allowed','connected','permitted']){const f=fixture();f.s[key]=false;assert.equal((await f.run()).status,'blocked');assert.equal(f.s.inspections,0);}
 for(const patch of [{actorId:'other'},{neighborId:'own-blog'},{ownPostId:'url'},{commentId:''},{checkedAt:1},{alreadyReplied:null},{alreadyReplied:true},{parentIsTopLevel:false},{returnPostId:'url'},{returnPostOwnerId:'unrelated-blog'}]){
  const f=fixture();Object.assign(f.snapshot,patch);assert.equal((await f.run()).status,'blocked');assert.equal(f.s.saves,0);
 }
 const f=fixture();f.s.current=false;await f.run();assert.equal(f.s.saves,0);
});
test('EN03 platform restriction stops the member; a lost capture response never rereads or writes again',async()=>{
 const f=fixture();f.snapshot.restriction='captcha';await f.run();assert.equal(f.s.stops,1);assert.equal(f.s.saves,0);
 const g=fixture();g.d.save=async()=>{g.s.saves++;throw Error('private-db-error');};const r=await g.run();assert.equal(r.status,'blocked');assert.equal(g.s.inspections,1);assert.equal(g.s.saves,1);assert.doesNotMatch(JSON.stringify(r),/private/);
});
test('EN04 member draft operations bind only inbox ID/body, reject forged targets and prevent the unbound reply path',async()=>{
 const calls=[];const handler=createWorkHandler({authorize:async()=>({allowed:true,userId:id}),execute:async(...args)=>{calls.push(args);return {data:{},error:null};}});
 const send=(operation,payload={})=>handler(new Request('https://fixture.test/api/work',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify({operation,payload})}));
 for(const op of ['engagement_list','engagement_review','draft_reply','draft_return_visit']){
  const payload=op==='engagement_list'?{}:op==='engagement_review'?{id}:{id,body:'member reviewed sentence'};assert.equal((await send(op,payload)).status,200);assert.equal(calls.at(-1)[0],id);
 }
 for(const payload of [{id,body:'ok',neighbor_id:'victim'},{id,body:'ok',parent_comment_id:'forged'},{id,body:'ok',user_id:'victim'},{id,body:'https://spam.test'},{id,body:''}])assert.equal((await send('draft_reply',payload)).status,400);
 assert.equal((await send('create',{account_id:id,neighbor_id:'neighbor',post_id:'123',kind:'reply',body:'unbound'})).status,400);
 assert.equal((await send('capture_incoming_comment',{})).status,403);assert.equal(calls.length,4);
});
