import test from 'node:test';
import assert from 'node:assert/strict';
import {createContextReader} from '../extension/context-bridge.mjs';
function fixture(){
 const calls=[],state={url:'https://blog.naver.com/own-blog/123',reads:0,fail:false};
 const scope={kind:'incoming',accountId:'account',actorId:'own-blog',targetOwner:'own-blog',postId:'123'};
 const browser={tabs:{query:async()=>[{id:7,windowId:8,url:state.url}]},windows:{get:async()=>({focused:true,state:'normal'})},scripting:{executeScript:async opts=>{
  assert.equal(opts.world,'ISOLATED');state.reads++;return [{frameId:1,result:{accountId:'account',actorId:'own-blog',checkedAt:Date.now(),restriction:'none',ownPostId:'123',complete:true,count:0,comments:[]}}];
 }}};
 const post=async(op,p)=>{calls.push(op);if(op==='offer')return {id:'read-1',phase:'read',nonce:'a',scope,profile:{}};if(op==='preview')return {phase:'preview',nonce:'b'};if(op==='confirm'){if(state.fail)throw Error('response lost');return {phase:'done',savedCount:0,externalActions:0};}return {phase:'idle'};};
 const reader=createContextReader(browser,async()=>({deviceId:'device',blogId:'own-blog'}),post);return {calls,state,reader};
}
test('CB01 preview never confirms itself; explicit confirmation reads the same pinned frame a second time',async()=>{
 const f=fixture();assert.equal((await f.reader.preview('incoming')).snapshot.count,0);assert.deepEqual(f.calls,['offer','preview']);assert.equal(f.state.reads,1);
 await f.reader.confirm();assert.deepEqual(f.calls,['offer','preview','confirm']);assert.equal(f.state.reads,2);
});
test('CB02 changing the active target prevents confirmation and discards the preview',async()=>{
 const f=fixture();await f.reader.preview('incoming');f.state.url='https://blog.naver.com/other/123';await assert.rejects(f.reader.confirm());assert.equal(f.calls.includes('confirm'),false);assert.equal(f.calls.at(-1),'cancel');
});
test('CB03 a lost confirmation response is not sent again and cannot leave a reusable approval',async()=>{
 const f=fixture();await f.reader.preview('incoming');f.state.fail=true;await assert.rejects(f.reader.confirm());await assert.rejects(f.reader.confirm());assert.equal(f.calls.filter(op=>op==='confirm').length,1);assert.equal(f.state.reads,2);
});
