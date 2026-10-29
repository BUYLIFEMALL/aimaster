// Serialized by scripting.executeScript in the isolated world. A reviewed DOM
// profile is supplied by the web server, never by page messages/member forms.
// There is deliberately no guessed default profile for live Naver markup.
export async function operateVisibleNaverWork(command) {
 const {operation,job,permit,profile:p}=command||{};
 const fail=()=>{throw Error('현재 네이버 계정·화면·대상을 확인하지 못했습니다.');};
 if(!['inspect','assert','apply','verify'].includes(operation)||!p||p.v!==1||p.reviewed!==true||typeof p.reference!=='string'||!p.reference.trim()||p.reference.length>500||!p.selectors||
  !job||!['request','like','comment','reply'].includes(job.kind)||typeof job.body!=='string'||job.body.length>4000||
  (job.kind==='request'?job.post_id!=='':!/^\d{1,30}$/.test(job.post_id))||
  !/^[a-z0-9_-]{1,50}$/.test(job.actor_id)||!/^[a-z0-9_-]{1,50}$/.test(job.neighbor_id)||job.actor_id===job.neighbor_id)fail();
 const visible=e=>!!e&&e.isConnected&&e.getClientRects().length>0&&!e.closest('[hidden],[aria-hidden="true"]');
 const list=(name,root=document)=>{
  const selector=p.selectors[name];if(typeof selector!=='string'||!selector.trim()||selector.length>256)fail();
  return [...root.querySelectorAll(selector)].filter(visible);
 };
 const one=(name,root=document)=>{const a=list(name,root);if(a.length!==1)fail();return a[0];};
 const text=e=>(e.innerText??e.textContent??'').trim();
 const profileId=e=>{
  try{const u=new URL(e.getAttribute('href'),location.href),m=/^\/([a-z0-9_-]{1,50})\/?$/.exec(u.pathname);
   return u.protocol==='https:'&&u.hostname==='blog.naver.com'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&m?m[1]:null;
  }catch{return null;}
 };
 const attr=name=>{const a=p[name];if(typeof a!=='string'||!(/^(id|data-[a-z0-9-]{1,40})$/.test(a)))fail();return a;};
 const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 function snapshot(){
  if(document.visibilityState!=='visible')fail();
  const url=new URL(location.href);if(url.protocol!=='https:'||url.hostname!=='blog.naver.com'||url.username||url.password||url.port||url.hash)fail();
  let owner,post;
  if(job.kind==='request'){
   if(url.pathname!=='/BuddyAddForm.naver'||url.searchParams.getAll('blogId').length!==1||url.searchParams.get('blogId')!==job.neighbor_id)fail();
   owner=job.neighbor_id;post='';
  }else{
   const m=/^\/([a-z0-9_-]{1,50})\/(\d{1,30})\/?$/.exec(url.pathname);
   if(m&&!url.search){[,owner,post]=m;}
   else if(url.pathname==='/PostView.naver'&&url.searchParams.getAll('blogId').length===1&&url.searchParams.getAll('logNo').length===1){owner=url.searchParams.get('blogId');post=url.searchParams.get('logNo');}
   if(owner!==(job.kind==='reply'?job.actor_id:job.neighbor_id)||post!==job.post_id)fail();
  }
  // This selector must identify the native account header, outside post content.
  if(profileId(one('ownerLink'))!==job.actor_id)fail();
  const restriction=list('captcha').length?'captcha':list('login').length?'login':list('platformRestriction').length?'platform':'none';
  const contexts={accountId:job.account_id,actorId:job.actor_id,neighborId:job.neighbor_id,postId:job.post_id,checkedAt:Date.now()};
  if(restriction!=='none')return {...contexts,restriction,relationship:'unknown',liked:null,duplicate:null};
  const rel=list('relationship');let relationship='unknown';
  if(rel.length===1&&p.relationshipMap&&Object.hasOwn(p.relationshipMap,text(rel[0])))relationship=p.relationshipMap[text(rel[0])];
  if(!['none','pending','mutual','removed','unknown'].includes(relationship))fail();
  let liked=null,duplicate=null,rows=[],parent;
  if(job.kind==='like'){
   const control=one('likeControl'),value=control.getAttribute('aria-pressed');liked=value==='true'?true:value==='false'?false:null;
  }
  if(job.kind==='request'&&operation!=='verify'){
   const mutual=one('requestMutual');if(!['radio','checkbox'].includes(mutual.getAttribute('type'))||!mutual.checked||mutual.disabled)fail();
  }
  if(['comment','reply'].includes(job.kind)){
   const complete=list('commentsComplete');
   if(complete.length!==1||typeof p.completeText!=='string'||!p.completeText||text(complete[0])!==p.completeText)fail();
   rows=list('commentRow',one('commentList'));if(rows.length>500)fail();
   duplicate=rows.some(row=>{const links=list('commentAuthor',row);return links.length===1&&profileId(links[0])===job.actor_id;});
   if(job.kind==='reply'){
    if(typeof job.parent_comment_id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(job.parent_comment_id))fail();
    const matches=rows.filter(row=>row.getAttribute(attr('commentIdAttribute'))===job.parent_comment_id);
    if(matches.length!==1)fail();parent=matches[0];
    if(parent.getAttribute(attr('parentIdAttribute'))||profileId(one('commentAuthor',parent))!==job.neighbor_id)fail();
    Object.assign(contexts,{postOwnerId:owner,parentCommentId:job.parent_comment_id,parentAuthorId:job.neighbor_id});
   }
  }
  return {...contexts,restriction,relationship,liked,duplicate,rows,parent};
 }
 const safe=s=>{const {rows,parent,...value}=s;return value;};
 const usable=s=>s.restriction==='none'&&(job.kind==='request'?['none','removed'].includes(s.relationship):s.relationship==='mutual'&&
  (job.kind==='like'?s.liked===false:s.duplicate===false));
 const freshPermit=()=>permit&&Number.isSafeInteger(permit.generation)&&permit.generation>0&&typeof permit.validUntil==='string'&&
  Date.parse(permit.validUntil)>Date.now()&&Date.parse(permit.validUntil)<=Date.now()+30000&&Date.parse(job.expires_at)>Date.now();
 let s;
 try{s=snapshot();}catch(error){if(operation==='inspect')return {unavailable:true};throw error;}
 if(operation==='inspect')return safe(s);
 if(operation==='assert')return usable(s)&&Date.parse(job.expires_at)>Date.now();
 if(operation==='verify'){
  // Allow a bounded UI settlement window, never another click/registration.
  // Each read repeats the URL/account/parent/restriction checks above.
  const changed=()=>job.kind==='request'?s.relationship==='pending':job.kind==='like'?s.liked===true:s.rows?.some(row=>profileId(one('commentAuthor',row))===job.actor_id);
  for(let i=0;i<20&&!changed()&&s.restriction==='none'&&Date.parse(job.expires_at)>Date.now();i++){
   await new Promise(resolve=>setTimeout(resolve,100));s=snapshot();
  }
  let state='unknown',effectId,bodyHash;
  if(s.restriction==='none'&&job.kind==='request'&&s.relationship==='pending')state='pending';
  if(s.restriction==='none'&&job.kind==='like'&&s.liked===true)state='liked';
  if(s.restriction==='none'&&s.relationship==='mutual'&&['comment','reply'].includes(job.kind)){
   const matches=s.rows.filter(row=>profileId(one('commentAuthor',row))===job.actor_id&&text(one('commentText',row))===job.body&&
    (job.kind==='reply'?row.getAttribute(attr('parentIdAttribute'))===job.parent_comment_id:!row.getAttribute(attr('parentIdAttribute'))));
   if(matches.length===1){effectId=matches[0].getAttribute(attr('commentIdAttribute'));if(/^[a-zA-Z0-9_-]{1,128}$/.test(effectId??'')){state='commented';bodyHash=await hash(job.body);}}
  }
  return {...safe(s),checkedAt:Date.now(),state,...(state==='commented'?{effectId,bodyHash}:{})};
 }
 if(!usable(s)||!freshPermit())fail();
 const root=job.kind==='reply'?s.parent:document;
 const buttonName=job.kind==='like'?'likeControl':job.kind==='request'?'requestSubmit':'commentSubmit';
 const button=one(buttonName,root);
 if(button.disabled||button.getAttribute('aria-disabled')==='true'||(job.kind!=='like'&&text(button)!==p.submitText?.[job.kind]))fail();
 if(job.kind!=='like'){
  const field=one(job.kind==='request'?'requestText':'commentInput',root);
  if(field.disabled||field.readOnly||!['TEXTAREA','INPUT'].includes(field.tagName)||!job.body.trim()||/https?:\/\/|www\./i.test(job.body))fail();
  if(!usable(snapshot())||!freshPermit())fail();
  const proto=field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(field,job.body);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));
  if(field.value!==job.body)fail();
 }
 // Re-read after page input handlers before the single physical submission.
 if(!usable(snapshot())||!freshPermit()||one(buttonName,root)!==button||button.disabled)fail();
 button.click();return true;
}
