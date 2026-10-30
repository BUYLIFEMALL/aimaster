import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {operateVisibleNaverWork} from '../extension/work-dom.mjs';
const profile={v:1,reviewed:true,reference:'SYNTHETIC-DOM-ONLY-NOT-LIVE-NAVER',articleCompleteText:'전문 표시',selectors:{articleBody:'.article',articleComplete:'.article-complete',ownerLink:'.account-owner',captcha:'.captcha',login:'.login-required',platformRestriction:'.restricted',relationship:'.relation',
 likeControl:'.like',commentList:'.comments',commentsComplete:'.complete',commentRow:'.comment',commentAuthor:':scope > .author',commentText:':scope > .text',commentInput:'textarea',commentSubmit:'.submit',requestText:'.request-text',requestSubmit:'.request-submit',requestMutual:'.mutual-mode'},
 relationshipMap:{'서로이웃':'mutual','이웃추가':'none','신청중':'pending'},completeText:'전체 표시 확인',commentIdAttribute:'data-comment-id',parentIdAttribute:'data-parent-id',submitText:{request:'신청',comment:'등록',reply:'등록'}};
const job={id:'fixture',account_id:'fixture-account',actor_id:'own-blog',neighbor_id:'neighbor',post_id:'123',kind:'comment',body:'fixture sentence',expires_at:new Date(Date.now()+60000).toISOString()};
async function fixture(kind,fn){
 const {window,document}=parseHTML('<html><body><main class="article">본문 전체를 확인하는 합성 자료입니다.</main><span class="article-complete">전문 표시</span><a class="account-owner" href="https://blog.naver.com/own-blog">내블로그</a><span class="relation">서로이웃</span><button class="like" aria-pressed="false">공감</button><span class="complete">전체 표시 확인</span><div class="comments"><div class="comment" data-comment-id="parent-1"><a class="author" href="https://blog.naver.com/neighbor">이웃</a><span class="text">original comment</span><textarea></textarea><button class="submit">등록</button></div></div><textarea></textarea><button class="submit">등록</button><textarea class="request-text"></textarea><button class="request-submit">신청</button></body></html>');
 Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});window.HTMLElement.prototype.getClientRects=()=>[{}];
 const globals={document,location:new URL(`https://blog.naver.com/${kind==='reply'?'own-blog':'neighbor'}/123`),HTMLTextAreaElement:window.HTMLTextAreaElement,HTMLInputElement:window.HTMLInputElement,Event:window.Event},old=new Map();
 for(const [k,v]of Object.entries(globals)){old.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 const j={...job,kind,post_id:kind==='request'?'':job.post_id,...(kind==='reply'?{parent_comment_id:'parent-1'}:{})},call=(operation,patch={})=>operateVisibleNaverWork({operation,job:j,profile,permit:{generation:1,deviceId:'fixture-device',validUntil:new Date(Date.now()+20000).toISOString()},...patch});
 try{await fn({document,window,j,call});}finally{for(const [k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
}
test('WD01 like uses a single physical control and verifies the changed aria state',()=>fixture('like',async({document,call})=>{
 let clicks=0;const button=document.querySelector('.like');button.addEventListener('click',()=>{clicks++;button.setAttribute('aria-pressed','true');});
 assert.equal((await call('inspect')).liked,false);assert.equal(await call('assert'),true);assert.equal(await call('apply'),true);assert.equal(clicks,1);assert.equal((await call('verify')).state,'liked');
}));
test('WD02 reply writes text only into its pinned parent and verifies exact visible reply id/body hash',()=>fixture('reply',async({document,call})=>{
 const parent=document.querySelector('.comment'),button=parent.querySelector('.submit');let clicks=0;
 button.addEventListener('click',()=>{clicks++;const row=document.createElement('div');row.className='comment';row.setAttribute('data-comment-id','reply-1');row.setAttribute('data-parent-id','parent-1');row.innerHTML='<a class="author" href="https://blog.naver.com/own-blog">나</a><span class="text"></span>';row.querySelector('.text').textContent=parent.querySelector('textarea').value;document.querySelector('.comments').append(row);});
 const observation=await call('inspect');assert.equal(observation.parentCommentId,'parent-1');assert.equal(observation.parentAuthorId,'neighbor');
 assert.equal(await call('apply'),true);assert.equal(clicks,1);assert.equal(document.querySelectorAll('textarea')[1].value,'');
 const effect=await call('verify');assert.equal(effect.state,'commented');assert.equal(effect.effectId,'reply-1');assert.match(effect.bodyHash,/^[a-f0-9]{64}$/);
}));
test('WD03 missing/incomplete/ambiguous profile, wrong actor and expired permit cannot submit',async()=>{
 for(const mutate of [d=>d.querySelector('.account-owner').setAttribute('href','https://blog.naver.com/other'),d=>d.querySelector('.complete').remove(),d=>d.querySelector('.comments').append(d.querySelector('.comment').cloneNode(true))]){
  await fixture('reply',async({document,call})=>{let clicks=0;document.querySelector('.submit').addEventListener('click',()=>clicks++);mutate(document);await assert.rejects(call('apply'));assert.equal(clicks,0);});
 }
 await fixture('like',async({call})=>{await assert.rejects(call('apply',{profile:null}));await assert.rejects(call('apply',{permit:{generation:1,validUntil:new Date(0).toISOString()}}));});
});
test('WD04 restrictions/unknown relation stop registration; unverified effect never becomes success',()=>fixture('like',async({document,call})=>{
 document.querySelector('.relation').textContent='미확인';assert.equal(await call('assert'),false);await assert.rejects(call('apply'));
 document.querySelector('.relation').textContent='서로이웃';const flag=document.createElement('div');flag.className='captcha';document.body.append(flag);
 assert.equal((await call('inspect')).restriction,'captcha');assert.equal((await call('verify')).state,'unknown');await assert.rejects(call('apply'));
}));
test('WD05 prepared neighbor request form submits once and verifies pending without inferring acceptance',()=>fixture('request',async({document,call})=>{
 globalThis.location=new URL('https://blog.naver.com/BuddyAddForm.naver?blogId=neighbor');document.querySelector('.relation').textContent='이웃추가';
 const mutual=document.createElement('input');mutual.className='mutual-mode';mutual.setAttribute('type','radio');mutual.checked=true;document.body.append(mutual);
 let clicks=0;document.querySelector('.request-submit').addEventListener('click',()=>{clicks++;document.querySelector('.relation').textContent='신청중';});
 assert.equal(await call('apply'),true);assert.equal(clicks,1);assert.equal((await call('verify')).state,'pending');
}));
test('WD06 delayed UI settlement is observed without repeating the physical click',()=>fixture('like',async({document,call})=>{
 let clicks=0;const button=document.querySelector('.like');button.addEventListener('click',()=>{clicks++;setTimeout(()=>button.setAttribute('aria-pressed','true'),20);});
 await call('apply');assert.equal((await call('verify')).state,'liked');assert.equal(clicks,1);
}));
test('WD07 top-level comment is verified by exact author, text and effect id',()=>fixture('comment',async({document,call})=>{
 const p={...profile,selectors:{...profile.selectors,commentInput:'body > textarea:not(.request-text)',commentSubmit:'body > .submit'}};
 let clicks=0;document.querySelector('body > .submit').addEventListener('click',()=>{clicks++;const row=document.createElement('div');row.className='comment';row.setAttribute('data-comment-id','comment-2');row.innerHTML='<a class="author" href="https://blog.naver.com/own-blog">나</a><span class="text"></span>';row.querySelector('.text').textContent=document.querySelector('body > textarea:not(.request-text)').value;document.querySelector('.comments').append(row);});
 await call('apply',{profile:p});const effect=await call('verify',{profile:p});assert.equal(effect.state,'commented');assert.equal(effect.effectId,'comment-2');assert.equal(clicks,1);
}));
test('WD08 unsupported frames return no evidence so all-frame inspection can select a single valid frame',()=>fixture('like',async({call})=>{
 globalThis.location=new URL('https://blog.naver.com/neighbor');assert.deepEqual(await call('inspect'),{unavailable:true});await assert.rejects(call('apply'));
}));

test('WD09 article metadata never returns body; missing completeness or changed content blocks registration',()=>fixture('like',async({document,call})=>{
 const first=await call('inspect');assert.match(first.articleHash,/^[a-f0-9]{64}$/);assert.equal(first.articleCharacters,[...document.querySelector('.article').textContent].length);assert.equal(Object.hasOwn(first,'body'),false);
 const expectedArticle={articleHash:first.articleHash,articleCharacters:first.articleCharacters};document.querySelector('.article').textContent+=' 바뀐 내용';await assert.rejects(call('apply',{expectedArticle}));document.querySelector('.article-complete').remove();assert.equal((await call('inspect')).unavailable,true);
}));
