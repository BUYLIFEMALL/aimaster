import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkBridge} from '../extension/work-bridge.mjs';
const device='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',account='33333333-3333-4333-8333-333333333333';
function fixture(){
 const calls=[],session={},state={focused:true,popup:false,hidden:false,url:'https://blog.naver.com/neighbor/123',actor:'own-blog',applies:0,change:null,lose:null,time:0,characters:1000,articleHash:'d'.repeat(64),onSleep:null};
 const job={id,account_id:account,actor_id:'own-blog',neighbor_id:'neighbor',post_id:'123',kind:'like',body:'',expires_at:new Date(Date.now()+600000).toISOString()};
 const browser={tabs:{query:async()=>[{id:state.activeTab??7,windowId:8,url:state.url}],get:async tabId=>({id:tabId,windowId:8,url:state.url,status:'complete'})},windows:{get:async()=>({focused:state.focused,state:'normal'})},
  storage:{session:{get:async k=>({[k]:session[k]}),set:async v=>Object.assign(session,v),remove:async k=>{delete session[k];}}},scripting:{executeScript:async opts=>{
   assert.equal(opts.world,'ISOLATED');const op=opts.args[0].operation;let result;
   if(op==='visibility')return [{frameId:0,result:state.hidden?'hidden':'visible'}];
   if(op==='inspect')result={articleHash:state.articleHash,articleCharacters:state.characters,accountId:account,actorId:'own-blog',neighborId:'neighbor',postId:'123',restriction:'none',relationship:'mutual',liked:false,duplicate:false,checkedAt:Date.now()};
   if(op==='assert')result=true;if(op==='apply'){assert.ok(session.workAttempts[`${device}:${id}:1`]);state.applies++;result=true;}
   if(op==='verify')result={state:'liked'};return [{frameId:1,result}];
  }}};
 const post=async(op,p)=>{
  calls.push(op);state.onPost?.(op);if(state.lose===op)throw Error('response lost');if(state.change&&op==='inspect')state.change();
  if(['offer','scheduled_offer','traversal_offer'].includes(op))return {id,phase:'inspect',nonce:'a'.repeat(64),job,profile:{v:1,reviewed:true,reference:'synthetic'}};
  if(op==='inspect')return {id,phase:'reading',readDurationMs:Math.max(30000,Math.ceil(state.characters/500)*5000),nonce:'b'.repeat(64)};
  if(op==='reading')return {id,phase:'recheck',nonce:'e'.repeat(64)};
  if(op==='recheck')return {id,phase:'apply',nonce:'c'.repeat(64),permit:{generation:1,deviceId:device,validUntil:new Date(Date.now()+20000).toISOString()}};
  if(op==='effect')return {phase:'done',state:'succeeded'};return {phase:'idle'};
 };
 const bridge=createWorkBridge(browser,async()=>({deviceId:device,blogId:state.actor}),post,Date.now,async windowId=>windowId===8&&state.popup,{now:()=>state.time,sleep:async ms=>{state.time+=ms;state.onSleep?.();}});
 return {calls,session,state,bridge};
}
test('WW01 web-only execution checks phases and persists the attempt before the one physical application',async()=>{
 const f=fixture(),r=await f.bridge.start();assert.match(r.message,/완료/);assert.equal(r.connected,false);assert.equal(f.state.applies,1);assert.deepEqual(f.calls,['offer','inspect','reading','recheck','effect']);assert.equal(f.session.workRun,undefined);
});
test('WW02 v1.17 using another program is fine while the target tab stays visible; a hidden tab cannot start',async()=>{
 const f=fixture();f.state.focused=false;await f.bridge.start();assert.equal(f.state.applies,1);
 const g=fixture();g.state.hidden=true;await assert.rejects(g.bridge.start());assert.equal(g.state.applies,0);assert.equal(g.calls.includes('offer'),false);
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

 test('WW06 reading minimum and length-dependent wait precede claiming; changes or lost focus stop without applying',async()=>{
  const f=fixture();await f.bridge.start();assert.equal(f.state.time,30000);
  const long=fixture();long.state.characters=10000;await long.bridge.start();assert.equal(long.state.time,100000);
  for(const mutate of [f=>f.state.url='https://blog.naver.com/neighbor/456',f=>f.state.articleHash='f'.repeat(64),f=>f.state.actor='other']){const g=fixture();g.state.onSleep=()=>mutate(g);await assert.rejects(g.bridge.start());assert.equal(g.state.applies,0);assert.equal(g.calls.includes('reading'),false);}
 });

test('WW07 a different approved job cannot replace the server-selected traversal target',async()=>{const f=fixture();await assert.rejects(f.bridge.start({scheduled:true,traversal:true,jobId:'99999999-9999-4999-8999-999999999999'}));assert.equal(f.state.applies,0);assert.equal(f.calls.includes('inspect'),false);});

test('WW10 v1.17 a hidden target only pauses the reading clock; it continues when visible again',async()=>{
 const f=fixture();let n=0;f.state.onSleep=()=>{n++;if(n===5)f.state.hidden=true;if(n===305)f.state.hidden=false;};
 await f.bridge.start();assert.equal(f.state.applies,1);assert.ok(f.state.time>=330000,'paused time is not counted as reading');
});
test('WW11 v1.17 hidden for more than 10 minutes: no click, the job is deferred (stop), never retried automatically',async()=>{
 const f=fixture();let n=0;f.state.onSleep=()=>{n++;if(n===3)f.state.hidden=true;};
 const r=await f.bridge.start();assert.equal(r.phase,'deferred');assert.equal(f.state.applies,0);assert.equal(f.calls.includes('reading'),false);assert.equal(f.calls.at(-1),'stop');assert.match(r.message,/다음 주기로 미룸/);
});
test('WW12 v1.17 the click step still needs the tab visible (no click in a hidden tab)',async()=>{
 const f=fixture();f.state.onPost=op=>{if(op==='reading')f.state.hidden=true;};
 await assert.rejects(f.bridge.start());assert.equal(f.state.applies,0);assert.equal(f.calls.includes('recheck'),false);assert.equal(f.calls.at(-1),'stop');
});
test('WW13 v1.18 looking at another tab in the same window only pauses reading; it continues when the target tab is in front again',async()=>{
 const f=fixture();let n=0;f.state.onSleep=()=>{n++;if(n===5)f.state.activeTab=99;if(n===65)f.state.activeTab=7;};
 await f.bridge.start();assert.equal(f.state.applies,1);assert.ok(f.state.time>=90000,'time behind another tab is not counted as reading');
});
test('WW14 v1.18 the click step needs the target tab in front (another tab in front means no click)',async()=>{
 const f=fixture();f.state.onPost=op=>{if(op==='reading')f.state.activeTab=99;};
 await assert.rejects(f.bridge.start());assert.equal(f.state.applies,0);assert.equal(f.calls.includes('recheck'),false);
});
test('WW15 v1.18 traversal passes its own tab: a hidden traversal tab waits before asking the server, and gives up after 10 minutes without any request',async()=>{
 const f=fixture();f.state.hidden=true;let n=0;f.state.onSleep=()=>{n++;if(n===20)f.state.hidden=false;};
 await f.bridge.start({traversal:true,scheduled:true,tabId:7});assert.equal(f.state.applies,1);assert.equal(f.calls[0],'traversal_offer');
 const g=fixture();g.state.hidden=true;const r=await g.bridge.start({traversal:true,scheduled:true,tabId:7});
 assert.equal(r.phase,'deferred');assert.equal(g.calls.length,0);assert.equal(g.state.applies,0);
});
