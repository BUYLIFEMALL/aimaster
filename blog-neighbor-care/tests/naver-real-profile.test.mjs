import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {operateVisibleNaverWork} from '../extension/work-dom.mjs';
import {readVisibleNeighborContext} from '../extension/context-reader.mjs';
import {operateIncomingRequests} from '../extension/accept-dom.mjs';
// Synthetic pages shaped like the real Naver markup. The selectors linkedom cannot run (:has) are simplified here only.
const real=JSON.parse(readFileSync(new URL('../docs/naver-dom-profile.v1.json',import.meta.url)));
const profile={...real,selectors:{...real.selectors,commentRow:'li.u_cbox_comment.public',requestRow:'tr.row',commentList:'ul.top'}};
const row=(no,author,text,level=1,parent=no)=>`<li class="u_cbox_comment public" data-info="commentNo:'${no}',deleted:false,secret:false,mine:false,replyLevel:${level},parentCommentNo:'${parent}',pick:false"><a class="u_cbox_name" href="https://blog.naver.com/${author}">이름</a><span class="u_cbox_contents">${text}</span></li>`;
const post=(o={})=>`<html><head><script>gUserNaverId = "${o.me??'own-blog'}";</script>${o.extraScript??''}</head><body><div class="se-main-container">글 본문입니다.</div><a class="btn_buddy _buddy_popup_btn">${o.rel??'서로이웃'}</a><div class="post-btn"><div class="my_reaction"><a class="u_likeit_button _face off" aria-pressed="${o.liked??'false'}">공감</a></div></div><a class="btn_comment _cmtList">댓글</a>${o.folded?'':`<div class="u_cbox_content_wrap"><ul class="u_cbox_list top">${o.rows??row('100','someone','첫 댓글')}</ul></div><div class="u_cbox_paginate">${o.more?'<a>2</a>':''}</div><div class="u_cbox_write_wrap"><div class="u_cbox_text" contenteditable="true"></div><button class="u_cbox_btn_upload">등록</button></div>`}</body></html>`;
const job={id:'j',account_id:'acc',actor_id:'own-blog',neighbor_id:'neighbor',post_id:'123',kind:'comment',body:'좋은 글 잘 읽었습니다.',expires_at:new Date(Date.now()+60000).toISOString()};
async function page(html,url,fn){
 const {window,document}=parseHTML(html);Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});window.HTMLElement.prototype.getClientRects=()=>[{}];
 const typed={};document.execCommand=(c,_u,v)=>{if(c==='insertText'){typed.value=v;document.activeElement?.append?.(v);}return true;};
 const globals={document,location:new URL(url),HTMLTextAreaElement:window.HTMLTextAreaElement,HTMLInputElement:window.HTMLInputElement,Event:window.Event},old=new Map();
 for(const [k,v]of Object.entries(globals)){old.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 try{await fn({document,typed});}finally{for(const [k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
}
const POST='https://blog.naver.com/PostView.naver?blogId=neighbor&logNo=123';
const permit={generation:1,deviceId:'d',validUntil:new Date(Date.now()+20000).toISOString()};
const call=(operation,j=job,p=profile)=>operateVisibleNaverWork({operation,job:j,profile:p,permit});
test('NR01 the signed-in id comes from the page script; another id or two different ids fail closed',async()=>{
 await page(post(),POST,async()=>{assert.equal((await call('inspect')).actorId,'own-blog');});
 await page(post({me:'other'}),POST,async()=>{assert.equal((await call('inspect')).unavailable,true);await assert.rejects(call('apply'));});
 await page(post({extraScript:'<script>gUserNaverId = "other";</script>'}),POST,async()=>{assert.equal((await call('inspect')).unavailable,true);});
});
test('NR02 like reads aria-pressed and clicks the one control once',async()=>{
 await page(post(),POST,async({document})=>{const j={...job,kind:'like',body:''};const b=document.querySelector('.u_likeit_button');let clicks=0;b.addEventListener('click',()=>{clicks++;b.setAttribute('aria-pressed','true');});
  assert.equal((await call('inspect',j)).liked,false);assert.equal(await call('apply',j),true);assert.equal(clicks,1);assert.equal((await call('verify',j)).state,'liked');});
 await page(post({liked:'true'}),POST,async()=>{const j={...job,kind:'like',body:''};assert.equal(await call('assert',j),false);await assert.rejects(call('apply',j));});
 await page(post({rel:'이웃추가'}),POST,async()=>{const j={...job,kind:'like',body:''};assert.equal(await call('assert',j),false);});
});
test('NR03 comment types into the editor, submits once and verifies by author, text and commentNo',async()=>{
 await page(post(),POST,async({document,typed})=>{const f=document.querySelector('.u_cbox_text');document.activeElement=f;Object.defineProperty(document,'activeElement',{value:f,configurable:true});
  let clicks=0;document.querySelector('.u_cbox_btn_upload').addEventListener('click',()=>{clicks++;document.querySelector('ul.top').insertAdjacentHTML('beforeend',row('200','own-blog',job.body));});
  assert.equal((await call('inspect')).duplicate,false);assert.equal(await call('apply'),true);assert.equal(typed.value,job.body);assert.equal(clicks,1);
  const v=await call('verify');assert.equal(v.state,'commented');assert.equal(v.effectId,'200');});
});
test('NR04 an existing own comment, a second comment page, or text that does not land never submits',async()=>{
 await page(post({rows:row('100','own-blog','이전 댓글')}),POST,async()=>{assert.equal((await call('inspect')).duplicate,true);await assert.rejects(call('apply'));});
 await page(post({more:true}),POST,async()=>{await assert.rejects(call('apply'));});
 await page(post(),POST,async({document})=>{let clicks=0;document.querySelector('.u_cbox_btn_upload').addEventListener('click',()=>clicks++);document.execCommand=()=>true;await assert.rejects(call('apply'));assert.equal(clicks,0);});
});
test('NR05 folded comments open once only on the job post, never elsewhere',async()=>{
 await page(post({folded:true}),POST,async({document})=>{let clicks=0;document.querySelector('.btn_comment').addEventListener('click',()=>clicks++);await call('inspect');assert.equal(clicks,1);});
 await page(post({folded:true}),'https://blog.naver.com/PostView.naver?blogId=neighbor&logNo=999',async({document})=>{let clicks=0;document.querySelector('.btn_comment').addEventListener('click',()=>clicks++);await call('inspect');assert.equal(clicks,0);});
});
test('NR06 the incoming comment reader takes ids from data-info and treats replies as children',async()=>{
 const rows=row('100','someone','원댓글')+row('101','own-blog','내 답글',2,'100')+row('300','second','다른 원댓글');
 await page(post({rows}),'https://blog.naver.com/PostView.naver?blogId=own-blog&logNo=123',async()=>{
  const v=readVisibleNeighborContext({scope:{kind:'incoming',targetOwner:'own-blog',postId:'123',actorId:'own-blog',accountId:'acc'},profile});
  assert.equal(v.count,2);assert.deepEqual(v.comments.map(c=>[c.commentId,c.alreadyReplied]),[['100',true],['300',false]]);});
});
const inbox=(ids,own='own-blog')=>`<html><body><table class="table4"><tbody>${ids.map(i=>`<tr class="row"><td><input type="checkbox" name="targetBlogId" value="${i}"></td><td><a class="blog_link" href="https://blog.naver.com/PostList.naver?userId=${i}">이름</a></td><td class="msg">신청 문구 비공개</td><td><button class="_acceptBuddy">수락</button></td></tr>`).join('')}</tbody></table></body></html>`;
const INBOX='https://admin.blog.naver.com/BuddyInviteReceivedManage.naver?blogId=own-blog';
test('NR07 the real inbox: ids from the checkbox, no message text, one exact click, a vanished row counts only after verify',async()=>{
 const a={actorId:'own-blog',accountId:'acc',requestId:'alpha-',neighborId:'alpha-',expiresAt:new Date(Date.now()+60000).toISOString()};
 await page(inbox(['alpha-','beta']),INBOX,async({document})=>{
  const read=await operateIncomingRequests({scope:{actorId:'own-blog',accountId:'acc'},profile});assert.deepEqual(read.requests.map(r=>r.neighborId),['alpha-','beta']);assert.doesNotMatch(JSON.stringify(read),/신청 문구/);
  assert.equal((await operateIncomingRequests({operation:'inspect',job:a,profile})).state,'pending');
  let clicks=0;const b=document.querySelector('button._acceptBuddy');b.addEventListener('click',()=>{clicks++;b.closest('tr').remove();});
  assert.equal(await operateIncomingRequests({operation:'apply',job:a,profile,validUntil:new Date(Date.now()+20000).toISOString()}),true);assert.equal(clicks,1);
  assert.equal((await operateIncomingRequests({operation:'verify',job:a,profile})).state,'mutual');
  assert.equal((await operateIncomingRequests({operation:'inspect',job:a,profile})).unavailable,true);
 });
 await page(inbox(['alpha-']),'https://admin.blog.naver.com/BuddyInviteReceivedManage.naver?blogId=other',async()=>{assert.equal((await operateIncomingRequests({operation:'inspect',job:a,profile})).unavailable,true);});
 await page(inbox(['alpha-']),INBOX,async()=>{const v=await operateIncomingRequests({operation:'verify',job:a,profile});assert.notEqual(v.state,'mutual');});
});
test('NR08 the profile needs no guessed request flow yet: request stays unusable on this profile',async()=>{
 assert.equal(profile.selectors.requestSubmit,undefined);assert.equal(profile.reviewed,true);
 await page(post(),'https://blog.naver.com/BuddyAdd.naver?blogId=neighbor',async()=>{await assert.rejects(call('apply',{...job,kind:'request',post_id:''}));});
});
