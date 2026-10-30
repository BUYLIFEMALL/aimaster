import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readVisibleNeighborContext} from '../extension/context-reader.mjs';
import {createExtensionContextHandler} from '../src/lib/neighbors/contextApi.ts';
const id='11111111-1111-4111-8111-111111111111';
const profile={v:1,reviewed:true,reference:'synthetic-only',selectors:{ownerLink:'.owner',captcha:'.captcha',login:'.login',platformRestriction:'.restricted',relationship:'.relationship',commentList:'.comments',commentsComplete:'.complete',commentRow:'.comment',commentAuthor:':scope > .author'},relationshipMap:{'서로이웃':'mutual','신청중':'pending'},completeText:'전체 확인',commentIdAttribute:'data-id',parentIdAttribute:'data-parent'};
function dom(kind,fn){
 const {window,document}=parseHTML('<html><body><a class="owner" href="https://blog.naver.com/own-blog">내블로그</a><span class="relationship">서로이웃</span><span class="complete">전체 확인</span><div class="comments"><div class="comment" data-id="original-1"><a class="author" href="https://blog.naver.com/neighbor">이웃</a><p>private-comment-body</p></div><div class="comment" data-id="original-2"><a class="author" href="https://blog.naver.com/neighbor">이웃</a></div><div class="comment" data-id="reply-1" data-parent="original-2"><a class="author" href="https://blog.naver.com/own-blog">나</a></div></div></body></html>');
 Object.defineProperty(document,'visibilityState',{value:'visible'});window.HTMLElement.prototype.getClientRects=()=>[{}];
 const globals={document,location:new URL(kind==='incoming'?'https://blog.naver.com/own-blog/123':kind==='return_post'?'https://blog.naver.com/neighbor/456':'https://blog.naver.com/neighbor')},old=new Map();
 for(const [k,v]of Object.entries(globals)){old.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 const scope={kind,accountId:id,actorId:'own-blog',targetOwner:kind==='incoming'?'own-blog':'neighbor',postId:kind==='incoming'?'123':kind==='return_post'?'456':''};
 try{fn({document,scope,read:()=>readVisibleNeighborContext({scope,profile})});}finally{for(const [k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
}
test('CD01 relationship reader reports explicit current state without form preparation, clicks or DOM mutation',()=>dom('relationship',({document,read})=>{
 const before=document.body.outerHTML,r=read();assert.equal(r.relationship,'mutual');assert.equal(r.neighborId,'neighbor');assert.equal(document.body.outerHTML,before);assert.doesNotMatch(JSON.stringify(r),/private-comment-body/);
}));
test('CD02 original-comment metadata distinguishes an existing own reply and excludes all comment text',()=>dom('incoming',({read})=>{
 const r=read();assert.equal(r.count,2);assert.equal(r.complete,true);assert.equal(r.comments[0].alreadyReplied,false);assert.equal(r.comments[1].alreadyReplied,true);assert.doesNotMatch(JSON.stringify(r),/private-comment-body|body|title/);
}));
test('CD03 incomplete lists, duplicate IDs and wrong account fail closed rather than becoming an empty list',()=>{
 for(const edit of [d=>d.querySelector('.complete').remove(),d=>d.querySelector('.comments').append(d.querySelector('.comment').cloneNode(true)),d=>d.querySelector('.owner').setAttribute('href','https://blog.naver.com/other')])dom('incoming',({document,read})=>{edit(document);assert.deepEqual(read(),{unavailable:true});});
});
test('CD04 return target is exact neighbor/post metadata only',()=>dom('return_post',({read,scope})=>{
 const r=read();assert.equal(r.postId,'456');assert.equal(r.neighborId,'neighbor');assert.doesNotMatch(JSON.stringify(r),/private-comment-body/);scope.targetOwner='other';assert.deepEqual(read(),{unavailable:true});
}));
test('CD05 context endpoint rejects web/cookie authority, raw writes, forged fields and comment bodies',async()=>{
 const calls=[],handler=createExtensionContextHandler({authorize:async()=>({allowed:true,userId:id,deviceId:id}),profile:()=>({profile,reads:['incoming']}),rpc:async(...args)=>{calls.push(args);return {data:{phase:'idle'},error:null};}});
 const send=(operation,payload={},headers={})=>handler(new Request('https://fixture.test/api/neighbors/context/extension',{method:'POST',headers:{authorization:`Bearer ${'a'.repeat(64)}`,'content-type':'application/json',...headers},body:JSON.stringify({operation,payload})}));
 assert.equal((await send('status',{}, {authorization:''})).status,401);assert.equal((await send('status',{}, {origin:'https://fixture.test'})).status,403);
 assert.equal((await send('result')).status,403);assert.equal((await send('offer',{request_id:id,kind:'incoming',url:'https://blog.naver.com/own-blog/123',user_id:'other'})).status,400);
 assert.equal((await send('preview',{id,nonce:'b'.repeat(64),snapshot:{accountId:id,actorId:'own-blog',checkedAt:Date.now(),restriction:'none',body:'private-body'}})).status,400);assert.equal(calls.length,0);
 assert.equal((await send('status')).status,200);assert.deepEqual(calls[0].slice(0,3),[id,id,'status']);
});
