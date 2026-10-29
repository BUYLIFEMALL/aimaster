import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {createHash} from 'node:crypto';
import {createWorkBridge} from '../extension/work-bridge.mjs';
import {runNativeEdgeWorker} from '../scripts/native-edge-worker.mjs';
import {executeApprovedWork} from '../src/lib/execution/approvedWork.ts';
const member='11111111-1111-4111-8111-111111111111',account='22222222-2222-4222-8222-222222222222',device='33333333-3333-4333-8333-333333333333',id='44444444-4444-4444-8444-444444444444';
const binding={memberId:member,accountId:account,deviceId:device,actorId:'own-blog'};
const job={id,user_id:member,account_id:account,actor_id:'own-blog',neighbor_id:'neighbor',post_id:'123',kind:'comment',body:'fixture sentence',state:'ready',expires_at:new Date(Date.now()+60000).toISOString()};
const event=()=>{const handlers=[];return {addListener:f=>handlers.push(f),emit:v=>handlers.forEach(f=>f(v))};};
const encode=v=>{const body=Buffer.from(JSON.stringify(v)),head=Buffer.alloc(4);head.writeUInt32LE(body.length);return Buffer.concat([head,body]);};
function fixture(){
 const input=new PassThrough(),output=new PassThrough(),onMessage=event(),onDisconnect=event(),sessionStore={},calls=[];
 const state={actor:'own-blog',device,url:'https://blog.naver.com/neighbor/123',focused:true,applies:0,lose:false,ambiguous:false};let session;
 const port={onMessage,onDisconnect,postMessage:v=>{session=v.session;input.write(encode(v));},disconnect:()=>{input.end();onDisconnect.emit();}};
 output.on('data',bytes=>{let offset=0;while(offset<bytes.length){const n=bytes.readUInt32LE(offset);const v=JSON.parse(bytes.subarray(offset+4,offset+4+n).toString());offset+=n+4;onMessage.emit(v);}});
 const browser={tabs:{query:async()=>[{id:7,windowId:8,url:state.url}]},windows:{get:async()=>({focused:state.focused,state:'normal'})},runtime:{connectNative:name=>{assert.equal(name,'xyz.buylife.blog_neighbor_care');return port;}},
  storage:{session:{get:async k=>({[k]:sessionStore[k]}),set:async v=>Object.assign(sessionStore,v)}},scripting:{executeScript:async options=>{
   assert.equal(options.world,'ISOLATED');assert.equal(options.target.tabId,7);const c=options.args[0];calls.push(c.operation);
   const context={accountId:account,actorId:'own-blog',neighborId:'neighbor',postId:'123',checkedAt:Date.now()};
   let result;if(c.operation==='inspect')result={...context,restriction:'none',relationship:'mutual',liked:false,duplicate:false};
   if(c.operation==='assert')result=true;
   if(c.operation==='apply'){assert.ok(sessionStore.workAttempts[`${device}:${id}:1`]);state.applies++;if(state.lose)port.disconnect();result=true;}
   if(c.operation==='verify')result={...context,state:'commented',bodyHash:createHash('sha256').update(job.body).digest('hex'),effectId:'fixture-comment-1'};
   if(state.ambiguous&&c.operation==='inspect')return [{frameId:1,result},{frameId:2,result}];return [{frameId:1,result}];
  }}};
 const bridge=createWorkBridge(browser,async()=>({deviceId:state.device,blogId:state.actor}));
 return {input,output,state,bridge,sessionStore,calls,port,onMessage,session:()=>session};
}
function worker(f,change){
 let current={...job};const rpcCalls=[];
 const createWorker=(_binding,adapter,url)=>({run:async({signal})=>{
  assert.equal(url,'https://blog.naver.com/neighbor/123');if(change){const inspect=adapter.inspect;adapter.inspect=async j=>{const v=await inspect(j);change(f);return v;};}
  const r=await executeApprovedWork({memberId:member,jobId:id,deviceId:device},{authorize:async()=>true,permitted:async()=>true,load:async()=>current,adapter,
   rpc:async(user,operation,p)=>{rpcCalls.push(operation);assert.equal(user,member);
    if(operation==='observe')return current;
    if(operation==='claim'){current={...current,state:'claimed',device_id:device,generation:1};return current;}
    if(operation==='arm'){current={...current,state:'armed',permit_until:new Date(Date.now()+20000).toISOString()};return current;}
    if(operation==='verify_permit')return {valid:true,id,permit_until:current.permit_until};
    if(operation==='result'){current={...current,state:p.outcome==='success'?'succeeded':'uncertain'};return current;}throw Error('Unexpected operation');
   }});return {outcome:r,aborted:signal.aborted};
 }});
 return {createWorker,rpcCalls};
}
async function run(f,w){const task=runNativeEdgeWorker({input:f.input,output:f.output,binding,profile:{v:1,reviewed:true,reference:'synthetic-only'},createWorker:w.createWorker,timeoutMs:300});await f.bridge.start();return task;}
test('WB01 native stdio -> Edge bridge -> pinned frame -> one recorded attempt -> verified server result',async()=>{
 const f=fixture(),w=worker(f);const result=await run(f,w);assert.equal(result.outcome.status,'succeeded');assert.equal(f.state.applies,1);
 assert.deepEqual(f.calls,['inspect','inspect','assert','apply','verify']);assert.deepEqual(w.rpcCalls,['observe','claim','observe','arm','verify_permit','result']);f.bridge.stop();
});
test('WB02 account/tab/window changes and ambiguous frames prevent physical application',async()=>{
 for(const change of [f=>f.state.actor='other',f=>f.state.device=member,f=>f.state.url='https://blog.naver.com/other/123',f=>f.state.focused=false]){
  const f=fixture(),w=worker(f,change);assert.notEqual((await run(f,w)).outcome.status,'succeeded');assert.equal(f.state.applies,0);f.bridge.stop();
 }
 const f=fixture();f.state.ambiguous=true;assert.equal((await run(f,worker(f))).outcome.status,'blocked');assert.equal(f.state.applies,0);f.bridge.stop();
});
test('WB03 lost native response after application preserves the attempt and reports uncertainty without a retry',async()=>{
 const f=fixture();f.state.lose=true;const r=await run(f,worker(f));assert.equal(r.outcome.status,'uncertain');assert.equal(f.state.applies,1);assert.equal(r.aborted,true);
 assert.ok(f.sessionStore.workAttempts[`${device}:${id}:1`]);assert.equal(f.calls.filter(x=>x==='apply').length,1);
});
test('WB04 retained device/job/generation attempt blocks a second connection before DOM application',async()=>{
 const f=fixture();f.sessionStore.workAttempts={[`${device}:${id}:1`]:Date.now()+60000};const r=await run(f,worker(f));assert.equal(r.outcome.status,'uncertain');assert.equal(f.state.applies,0);f.bridge.stop();
});
test('WB05 invalid native origin command cannot invoke scripting and an unconfigured host cannot start a worker',async()=>{
 const f=fixture();await f.bridge.start();f.onMessage.emit({v:1,type:'command',session:'wrong',id,operation:'apply',job});await new Promise(r=>setImmediate(r));assert.equal(f.calls.length,0);assert.equal(f.bridge.status().connected,false);
 await assert.rejects(runNativeEdgeWorker({input:new PassThrough(),output:new PassThrough(),binding,profile:null,createWorker:()=>assert.fail('Unconfigured host')}));
});
test('WB06 concurrent start is rejected and a stop during startup cannot open a late connection',async()=>{
 const f=fixture(),first=f.bridge.start();await assert.rejects(f.bridge.start());await first;f.bridge.stop();
 const g=fixture(),opening=g.bridge.start();g.bridge.stop();await assert.rejects(opening);assert.equal(g.bridge.status().connected,false);
});
