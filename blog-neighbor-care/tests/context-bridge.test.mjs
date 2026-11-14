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

test('CB-P1 a preview survives a sleeping service worker and a closed popup, and a cancelled one does not come back',async()=>{
 const {createContextReader}=await import('../extension/context-bridge.mjs');
 const store={},calls=[];const browser={storage:{session:{get:async k=>({[k]:store[k]}),set:async v=>Object.assign(store,v),remove:async k=>{delete store[k];}}},tabs:{query:async()=>[{id:1,windowId:2,url:'https://blog.naver.com/own/1'}]},windows:{get:async()=>({focused:true,state:'normal'})},scripting:{executeScript:async()=>[{frameId:0,result:{accountId:'a',actorId:'own'}}]}};
 const post=async(op,p)=>{calls.push(op);if(op==='offer')return {phase:'read',id:'r1',nonce:'n1',scope:{actorId:'own',accountId:'a'},profile:{}};if(op==='preview')return {phase:'preview',nonce:'n2'};if(op==='confirm'){assert.equal(p.nonce,'n2');return {phase:'done',savedCount:1};}return {};};
 const make=()=>createContextReader(browser,async()=>({deviceId:'d',blogId:'own'}),post);
 await make().preview('incoming');assert.equal((await make().confirm()).phase,'done');assert.equal(store.contextPending,undefined);
 await assert.rejects(make().confirm(),/미리보기부터/);
 await make().preview('incoming');await make().cancel();assert.equal(store.contextPending,undefined);assert.ok(calls.includes('cancel'));await assert.rejects(make().confirm(),/미리보기부터/);
});

test('CB-T1 (2026-11-14) a return-post read from the member own blog tab stops before any server call',async()=>{
 const {createContextReader,blogPost}=await import('../extension/context-bridge.mjs');
 const calls=[];let url='https://blog.naver.com/own/224437302971';
 const browser={tabs:{query:async()=>[{id:1,windowId:2,url}]},windows:{get:async()=>({focused:true,state:'normal'})},scripting:{executeScript:async()=>[]}};
 const reader=createContextReader(browser,async()=>({deviceId:'d',blogId:'own'}),async op=>{calls.push(op);return {};});
 await assert.rejects(reader.preview('return_post'),e=>e.stage==='tab'&&/내 블로그/.test(e.message));
 url='https://blog.naver.com/neighbor';await assert.rejects(reader.preview('return_post'),e=>e.stage==='tab');
 url='https://blog.naver.com/neighbor/224231976765';await assert.rejects(reader.preview('incoming'),e=>e.stage==='tab'&&/내 블로그 글/.test(e.message));
 assert.deepEqual(calls.filter(op=>op!=='cancel'),[]);
 assert.deepEqual(blogPost('https://blog.naver.com/PostView.naver?blogId=neighbor&logNo=12'),{owner:'neighbor',post:'12'});
 assert.equal(blogPost('https://m.blog.naver.com/neighbor/12'),null);
});
test('CB-T2 (2026-11-14) a refused offer keeps HTTP status and BNC code and names the failing stage',async()=>{
 const {createContextReader}=await import('../extension/context-bridge.mjs');
 const browser={tabs:{query:async()=>[{id:1,windowId:2,url:'https://blog.naver.com/neighbor/224231976765'}]},windows:{get:async()=>({focused:true,state:'normal'})},scripting:{executeScript:async()=>[]}};
 const reader=createContextReader(browser,async()=>({deviceId:'d',blogId:'own'}),async op=>{if(op==='offer')throw Object.assign(Error('refused'),{status:409,code:'BNC_RETURN_SOURCE_REQUIRED'});return {};});
 await assert.rejects(reader.preview('return_post'),e=>e.stage==='offer'&&e.status===409&&e.code==='BNC_RETURN_SOURCE_REQUIRED');
});
