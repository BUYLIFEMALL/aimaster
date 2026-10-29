import test from 'node:test';
import assert from 'node:assert/strict';
import {createExtensionExecutionHandler} from '../src/lib/execution/extensionApi.ts';
import {createWorkHandler} from '../src/lib/work-api.ts';
const id='11111111-1111-4111-8111-111111111111',token='a'.repeat(64);
function fixture(){const calls=[];let profileCalls=0;
 const d={authorize:async()=>({allowed:true,userId:id,deviceId:id}),profile:()=>{profileCalls++;return {profile:{v:1,reviewed:true,reference:'synthetic-only'},kinds:['like']};},
  rpc:async(...args)=>{calls.push(args);return {data:{phase:'inspect',id,job:{id,user_id:id,account_id:id,actor_id:'own-blog',neighbor_id:'neighbor',post_id:'123',kind:'like',body:'',expires_at:'2099-01-01',approval_hash:'private-hash',token_hash:'private-token'}},error:null};}};
 const handler=createExtensionExecutionHandler(d),send=(operation,payload={},headers={})=>handler(new Request('https://fixture.test/api/execution/extension',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...headers},body:JSON.stringify({operation,payload})}));
 return {d,calls,send,profileCalls:()=>profileCalls};}
test('XA01 cookies/web origins do not authorize execution and denied device membership never reaches queue state',async()=>{
 const f=fixture();assert.equal((await f.send('status',{}, {authorization:''})).status,401);assert.equal((await f.send('status',{}, {origin:'https://fixture.test'})).status,403);
 f.d.authorize=async()=>({allowed:false,status:403});assert.equal((await f.send('status')).status,403);assert.equal(f.calls.length,0);
});
test('XA02 dedicated extension stages cannot proxy raw RPCs or forge identity; offers redact internal job fields',async()=>{
 const f=fixture();for(const op of ['claim','arm','observe','result','configure'])assert.equal((await f.send(op)).status,403);
 for(const p of [{request_id:id,url:'https://evil.test/neighbor/123'},{request_id:id,url:'https://blog.naver.com/neighbor/123',user_id:'victim'}])assert.equal((await f.send('offer',p)).status,400);
 const r=await f.send('offer',{request_id:id,url:'https://blog.naver.com/neighbor/123'}),v=await r.json();assert.equal(r.status,200);assert.match(v.data.nonce,/^[a-f0-9]{64}$/);assert.doesNotMatch(JSON.stringify(v),/private-hash|private-token|token_hash|approval_hash/);
 assert.equal(f.calls[0][0],id);assert.equal(f.calls[0][1],id);assert.equal(f.calls[0][3].owner,'neighbor');assert.equal(Object.hasOwn(f.calls[0][3],'user_id'),false);
});
test('XA03 status/stop work without activating a profile; failed or lost API responses are never retried',async()=>{
 const f=fixture();f.d.profile=()=>assert.fail('Status cannot load active execution config');f.d.rpc=async()=>({data:{phase:'idle'},error:null});assert.equal((await f.send('status')).status,200);
 let calls=0;f.d.rpc=async()=>{calls++;throw Error('private-key-value');};const r=await f.send('stop',{id});assert.equal(r.status,503);assert.equal(calls,1);assert.doesNotMatch(await r.text(),/private-key/);
 const g=fixture();g.d.profile=()=>null;assert.equal((await g.send('offer',{request_id:id,url:'https://blog.naver.com/neighbor/123'})).status,409);assert.equal(g.calls.length,0);
});
test('XA04 web member consent cannot grant another user identity or silently allow unknown actions',async()=>{
 const calls=[],handler=createWorkHandler({authorize:async()=>({allowed:true,userId:id}),execute:async(...args)=>{calls.push(args);return {data:{},error:null};}});
 const send=payload=>handler(new Request('https://fixture.test/api/work',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify({operation:'grant_extension',payload})}));
 for(const p of [{device_id:id,kinds:['like'],confirmed:false},{device_id:id,kinds:['delete'],confirmed:true},{device_id:id,kinds:['like'],confirmed:true,user_id:'victim'}])assert.equal((await send(p)).status,400);
 assert.equal((await send({device_id:id,kinds:['like'],confirmed:true})).status,200);assert.equal(calls.length,1);assert.equal(calls[0][0],id);
});
