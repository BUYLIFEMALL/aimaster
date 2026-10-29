import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkBridge} from '../extension/work-bridge.mjs';
const device='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',account='33333333-3333-4333-8333-333333333333';
function fixture(){
 const calls=[],session={},state={focused:true,popup:false,url:'https://blog.naver.com/neighbor/123',actor:'own-blog',applies:0,change:null,lose:null};
 const job={id,account_id:account,actor_id:'own-blog',neighbor_id:'neighbor',post_id:'123',kind:'like',body:'',expires_at:new Date(Date.now()+600000).toISOString()};
 const browser={tabs:{query:async()=>[{id:7,windowId:8,url:state.url}]},windows:{get:async()=>({focused:state.focused,state:'normal'})},
  storage:{session:{get:async k=>({[k]:session[k]}),set:async v=>Object.assign(session,v),remove:async k=>{delete session[k];}}},scripting:{executeScript:async opts=>{
   assert.equal(opts.world,'ISOLATED');const op=opts.args[0].operation;let result;
   if(op==='inspect')result={accountId:account,actorId:'own-blog',neighborId:'neighbor',postId:'123',restriction:'none',relationship:'mutual',liked:false,duplicate:false,checkedAt:Date.now()};
   if(op==='assert')result=true;if(op==='apply'){assert.ok(session.workAttempts[`${device}:${id}:1`]);state.applies++;result=true;}
   if(op==='verify')result={state:'liked'};return [{frameId:1,result}];
  }}};
 const post=async(op,p)=>{
  calls.push(op);if(state.lose===op)throw Error('response lost');if(state.change&&op==='inspect')state.change();
  if(op==='offer')return {id,phase:'inspect',nonce:'a'.repeat(64),job,profile:{v:1,reviewed:true,reference:'synthetic'}};
  if(op==='inspect')return {id,phase:'recheck',nonce:'b'.repeat(64)};
  if(op==='recheck')return {id,phase:'apply',nonce:'c'.repeat(64),permit:{generation:1,deviceId:device,validUntil:new Date(Date.now()+20000).toISOString()}};
  if(op==='effect')return {phase:'done',state:'succeeded'};return {phase:'idle'};
 };
 const bridge=createWorkBridge(browser,async()=>({deviceId:device,blogId:state.actor}),post,Date.now,async windowId=>windowId===8&&state.popup);
 return {calls,session,state,bridge};
}
test('WW01 web-only execution checks phases and persists the attempt before the one physical application',async()=>{
 const f=fixture(),r=await f.bridge.start();assert.match(r.message,/완료/);assert.equal(r.connected,false);assert.equal(f.state.applies,1);assert.deepEqual(f.calls,['offer','inspect','recheck','effect']);assert.equal(f.session.workRun,undefined);
});
test('WW02 own visible extension popup is allowed; a different foreground app/window cannot execute',async()=>{
 const f=fixture();f.state.focused=false;f.state.popup=true;await f.bridge.start();assert.equal(f.state.applies,1);
 const g=fixture();g.state.focused=false;await assert.rejects(g.bridge.start());assert.equal(g.state.applies,0);assert.equal(g.calls.includes('offer'),false);
});
test('WW03 tab/account changes after the first server step stop without application',async()=>{
 for(const key of ['url','actor']){const f=fixture();f.state.change=()=>{f.state[key]=key==='url'?'https://blog.naver.com/other/123':'other';};await assert.rejects(f.bridge.start());assert.equal(f.state.applies,0);assert.equal(f.calls.at(-1),'stop');}
});
test('WW04 persisted attempt or missing registration permission blocks another click without automatic retry',async()=>{
 const f=fixture();f.session.workAttempts={[`${device}:${id}:1`]:Date.now()+600000};await assert.rejects(f.bridge.start());assert.equal(f.state.applies,0);
 const g=fixture();g.state.lose='recheck';await assert.rejects(g.bridge.start());assert.equal(g.state.applies,0);assert.equal(g.calls.filter(x=>x==='recheck').length,1);
});
test('WW05 status is read-only and a lost final response never repeats application or report',async()=>{
 const f=fixture();await f.bridge.status();assert.deepEqual(f.calls,['status']);assert.equal(f.state.applies,0);
 const g=fixture();g.state.lose='effect';await assert.rejects(g.bridge.start());assert.equal(g.state.applies,1);assert.equal(g.calls.filter(x=>x==='effect').length,1);assert.ok(g.session.workAttempts[`${device}:${id}:1`]);
});
