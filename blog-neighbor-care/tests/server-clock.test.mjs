import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerClock} from '../extension/server-clock.mjs';
import {createContextReader} from '../extension/context-bridge.mjs';
import {createAcceptBridge} from '../extension/accept-bridge.mjs';
import {createExtensionContextHandler} from '../src/lib/neighbors/contextApi.ts';
import {createAcceptHandler} from '../src/lib/neighbors/acceptApi.ts';
const SKEW=-1632; // measured on the mac mini: its clock was at least 1.63 s behind the database
const server=()=>Date.now(),local=()=>Date.now()+SKEW;
test('SC01 clock offset comes only from a numeric serverNow and shifts checkedAt and deadlines both ways',()=>{
 const c=createServerClock(()=>1000);assert.equal(c.now(),1000);c.note({serverNow:'x'});assert.equal(c.offset,0);
 c.note({serverNow:2632});assert.equal(c.offset,1632);assert.equal(c.fix({checkedAt:1000}).checkedAt,2632);assert.equal(c.fix(true),true);
 assert.equal(c.toLocal(new Date(30000).toISOString()),new Date(30000-1632).toISOString());
});
test('SC02 a lagging PC preview and later confirmation both carry server-time checkedAt, also after the worker restarts',async()=>{
 const store={},sent={};const scope={kind:'incoming',accountId:'a',actorId:'own',targetOwner:'own',postId:'1'};
 const browser={storage:{session:{get:async k=>({[k]:store[k]}),set:async v=>Object.assign(store,v),remove:async k=>{delete store[k];}}},tabs:{query:async()=>[{id:1,windowId:2,url:'https://blog.naver.com/own/1'}]},windows:{get:async()=>({focused:true,state:'normal'})},
  scripting:{executeScript:async()=>[{frameId:0,result:{accountId:'a',actorId:'own',checkedAt:local(),restriction:'none',ownPostId:'1',complete:true,count:0,comments:[]}}]}};
 let created;const post=async(op,p)=>{sent[op]=p;if(op==='offer'){created=server();return {phase:'read',id:'r1',nonce:'n1',scope,profile:{},serverNow:server()};}if(op==='preview')return {phase:'preview',nonce:'n2',serverNow:server()};if(op==='confirm')return {phase:'done',savedCount:0};return {};};
 const make=()=>createContextReader(browser,async()=>({deviceId:'d',blogId:'own'}),post,async()=>false,undefined,local);
 await make().preview('incoming');
 // the database refuses observed<created_at; a raw PC time would be about 1.6 s too early
 assert.ok(sent.preview.snapshot.checkedAt>=created,'preview checkedAt must not precede the database request time');
 assert.ok(sent.preview.snapshot.checkedAt<=server()+50);
 await make().confirm();assert.ok(sent.confirm.snapshot.checkedAt>=sent.preview.snapshot.checkedAt);assert.ok(sent.confirm.snapshot.checkedAt<=server()+50);
});
test('SC03 a lagging PC accept passes the page deadline check and sends server-time attempt and result times',async()=>{
 const saved={},sent={};let armedAt;const id='11111111-1111-4111-8111-111111111111';
 const job={accountId:id,actorId:'owner',neighborId:'neighbor',requestId:'req-1',expiresAt:new Date(Date.now()+3600000).toISOString()};
 const browser={storage:{session:{get:async k=>({[k]:saved[k]}),set:async v=>Object.assign(saved,v),remove:async k=>delete saved[k]}},tabs:{query:async()=>[{id:7,windowId:8,url:'https://admin.blog.naver.com/owner'}]},windows:{get:async()=>({focused:true,state:'normal'})},
  scripting:{executeScript:async o=>{const c=o.args[0];if(c.operation==='apply'){const v=Date.parse(c.validUntil),n=local();assert.ok(v>n&&v<=n+30000,'page permit check uses the PC clock');return [{frameId:1,result:true}];}
   return [{frameId:1,result:{accountId:id,actorId:'owner',neighborId:'neighbor',requestId:'req-1',checkedAt:local(),restriction:'none',state:c.operation==='verify'?'mutual':'pending'}}];}}};
 const post=async(op,p)=>{sent[op]=p;const at={serverNow:server()};if(op==='offer_work')return {...at,id,phase:'inspect',job,profile:{},nonce:'a'};if(op==='inspect')return {...at,phase:'recheck',nonce:'b'};
  if(op==='arm'){armedAt=server();return {...at,phase:'apply',nonce:'c',validUntil:new Date(armedAt+30000).toISOString()};}if(op==='effect')return {...at,state:'succeeded'};return {...at,state:'uncertain'};};
 const r=await createAcceptBridge(browser,async()=>({deviceId:'d',blogId:'owner'}),post,async()=>false,local).start();assert.equal(r.state,'succeeded');
 // the database refuses attempted_at<valid_until-30s (= arm time) and observed<attempted_at
 assert.ok(sent.effect.attempted_at>=armedAt);assert.ok(sent.effect.snapshot.checkedAt>=sent.effect.attempted_at);
 assert.ok(sent.inspect.snapshot.checkedAt<=server()+50&&sent.inspect.snapshot.checkedAt>=server()-1000);
});
const req=(url,op,payload)=>new Request(url,{method:'POST',headers:{authorization:`Bearer ${'a'.repeat(64)}`,'content-type':'application/json'},body:JSON.stringify({operation:op,payload})});
test('SC04 both extension APIs return serverNow on success and the refusing BNC code (only) on a 409',async()=>{
 const ok=async()=>({data:{phase:'idle'},error:null}),bad=async()=>({data:null,error:{message:'BNC_READ_CONTEXT'}}),odd=async()=>({data:null,error:{message:'secret detail'}});
 const ctx=rpc=>createExtensionContextHandler({authorize:async()=>({allowed:true,userId:'u',deviceId:'d'}),profile:()=>null,rpc});
 const before=Date.now(),a=await (await ctx(ok)(req('https://x.test/c','status',{}))).json();assert.ok(a.data.serverNow>=before);
 const b=await ctx(bad)(req('https://x.test/c','status',{}));assert.equal(b.status,409);assert.equal((await b.json()).code,'BNC_READ_CONTEXT');
 assert.equal((await (await ctx(odd)(req('https://x.test/c','status',{}))).json()).code,undefined);
 const acc=rpc=>createAcceptHandler({authorize:async()=>({allowed:true,userId:'u',deviceId:'d'}),profile:()=>null,rpc});
 const c=await (await acc(ok)(req('https://x.test/a','status_work',{}))).json();assert.ok(c.data.serverNow>=before);
 const e=await acc(async()=>({data:null,error:{message:'BNC_ACCEPT_CONTEXT'}}))(req('https://x.test/a','status_work',{}));assert.equal(e.status,409);assert.equal((await e.json()).code,'BNC_ACCEPT_CONTEXT');
});
