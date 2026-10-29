import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {createNativeBrowserPeer,createNativeExecutionAdapter,jobMatchesBrowserUrl} from '../src/lib/execution/nativeBrowser.ts';
const user='11111111-1111-4111-8111-111111111111',account='22222222-2222-4222-8222-222222222222',device='33333333-3333-4333-8333-333333333333',id='44444444-4444-4444-8444-444444444444';
const binding={memberId:user,accountId:account,deviceId:device,actorId:'own-blog'},session='a'.repeat(64);
const job={id,user_id:user,account_id:account,actor_id:'own-blog',neighbor_id:'neighbor',post_id:'123',kind:'comment',body:'private sentence',expires_at:'2099-01-01T00:00:00Z'};
const frame=v=>{const body=Buffer.from(JSON.stringify(v)),header=Buffer.alloc(4);header.writeUInt32LE(body.length);return Buffer.concat([header,body]);};
function fixture(timeoutMs=100){const input=new PassThrough(),output=new PassThrough(),messages=[];
 output.on('data',v=>messages.push(JSON.parse(v.subarray(4).toString())));const peer=createNativeBrowserPeer(input,output,binding,{timeoutMs});
 const hello=patch=>frame({v:1,type:'hello',session,deviceId:device,actorId:'own-blog',url:'https://blog.naver.com/neighbor/123',...patch});
 const respond=(value,patch={})=>input.write(frame({v:1,type:'result',session,id:messages.at(-1).id,ok:true,result:value,...patch}));
 return {input,output,messages,peer,hello,respond};}
test('NB01 fragmented native frames preserve exact binding and match each command response',async()=>{
 const f=fixture(),h=f.hello();f.input.write(h.subarray(0,2));f.input.write(h.subarray(2,10));f.input.write(h.subarray(10));await f.peer.ready;
 const request=f.peer.request('inspect',job);await new Promise(r=>setImmediate(r));assert.equal(f.messages.length,1);assert.equal(f.messages[0].operation,'inspect');
 f.respond({actorId:'own-blog'});assert.deepEqual(await request,{actorId:'own-blog'});f.peer.close();
});
test('NB02 wrong device/actor/site and unsolicited/oversize responses close the channel before commands',async()=>{
 for(const patch of [{deviceId:user},{actorId:'other'},{url:'https://evil.test/neighbor/123'},{extra:'field'}]){const f=fixture();f.input.write(f.hello(patch));await assert.rejects(f.peer.ready);assert.equal(f.messages.length,0);}
 const f=fixture();const length=Buffer.alloc(4);length.writeUInt32LE(65537);f.input.write(length);await assert.rejects(f.peer.ready);
});
test('NB03 timeout and replay never retransmit; a second concurrent command is rejected',async()=>{
 const f=fixture(30);f.input.write(f.hello());await f.peer.ready;
 const first=f.peer.request('apply',job,{generation:1,deviceId:device,validUntil:'2099-01-01T00:00:00Z'});
 await assert.rejects(f.peer.request('apply',job));await assert.rejects(first);assert.equal(f.messages.length,1);assert.equal(f.peer.isClosed(),true);
 const g=fixture();g.input.write(g.hello());await g.peer.ready;const req=g.peer.request('assert',job);await new Promise(r=>setImmediate(r));g.respond(true,{id:user});await assert.rejects(req);assert.equal(g.peer.isClosed(),true);
});
test('NB04 target matching distinguishes own-post replies, neighbor engagement and a prepared request form',()=>{
 assert.equal(jobMatchesBrowserUrl(job,'https://blog.naver.com/neighbor/123'),true);
 assert.equal(jobMatchesBrowserUrl(job,'https://blog.naver.com/own-blog/123'),false);
 assert.equal(jobMatchesBrowserUrl({...job,kind:'reply'},'https://blog.naver.com/own-blog/123'),true);
 assert.equal(jobMatchesBrowserUrl({...job,kind:'request',post_id:''},'https://blog.naver.com/BuddyAddForm.naver?blogId=neighbor'),true);
 for(const url of ['https://blog.naver.com/neighbor/999','https://blog.naver.com/neighbor/123#other','https://blog.naver.com.evil.test/neighbor/123','https://blog.naver.com/BuddyAddForm.naver?blogId=neighbor&blogId=other'])assert.equal(jobMatchesBrowserUrl(job,url),false);
});
test('NB05 adapter exposes only four bounded native commands; false apply cannot be treated as success',async()=>{
 const f=fixture();f.input.write(f.hello());await f.peer.ready;const adapter=createNativeExecutionAdapter(f.peer,{v:1,reviewed:true,reference:'synthetic-only'});
 const result=adapter.apply(job,{generation:1,deviceId:device,validUntil:'2099-01-01T00:00:00Z'});await new Promise(r=>setImmediate(r));f.respond(false);await assert.rejects(result);assert.equal(f.messages.length,1);assert.equal(Object.hasOwn(f.messages[0],'ticket'),false);f.peer.close();
});
