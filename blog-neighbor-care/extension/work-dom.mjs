// Serialized by scripting.executeScript in the isolated world. A reviewed DOM
// profile is supplied by the web server, never by page messages/member forms.
// There is deliberately no guessed default profile for live Naver markup.
export async function operateVisibleNaverWork(command) {
 const {operation,job,permit,profile:p,expectedArticle}=command||{};
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
 // Naver keeps the signed-in id only in page scripts on a neighbor's post. The value comes from the web server's reviewed profile, and two different values fail closed.
 const ownerId=()=>{const v=p.ownerScriptVar;if(v===undefined)return profileId(one('ownerLink'));if(typeof v!=='string'||!/^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(v))fail();const re=new RegExp('\\b'+v+'\\s*=\\s*["\']([a-z0-9_-]{1,50})["\']');const found=new Set();for(const s of document.querySelectorAll('script')){const m=re.exec(s.textContent??'');if(m)found.add(m[1]);}return found.size===1?[...found][0]:null;};
 const commentInfo=(row,key)=>{const a=p.commentInfoAttribute;
  if(a===undefined)return row.getAttribute(attr(key==='id'?'commentIdAttribute':'parentIdAttribute'));
  if(typeof a!=='string'||!/^data-[a-z0-9-]{1,40}$/.test(a))fail();const s=row.getAttribute(a)??'';
  if(key==='id')return /\bcommentNo:'(\d{1,30})'/.exec(s)?.[1]??null;
  return /\breplyLevel:1\b/.test(s)?'':/\bparentCommentNo:'(\d{1,30})'/.exec(s)?.[1]??null;
 };
 const commentsComplete=()=>{if(p.commentsCompleteMode==='singlePage')return list('commentPageLink').length===0;
  const complete=list('commentsComplete');return complete.length===1&&typeof p.completeText==='string'&&!!p.completeText&&text(complete[0])===p.completeText;};
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
  if(ownerId()!==job.actor_id)fail();
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
   if(!commentsComplete())fail();
   rows=list('commentRow',one('commentList'));if(rows.length>500)fail();
   duplicate=rows.some(row=>{const links=list('commentAuthor',row);return links.length===1&&profileId(links[0])===job.actor_id;});
   if(job.kind==='reply'){
    if(typeof job.parent_comment_id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(job.parent_comment_id))fail();
    const matches=rows.filter(row=>commentInfo(row,'id')===job.parent_comment_id);
    if(matches.length!==1)fail();parent=matches[0];
    if(commentInfo(parent,'parent')||profileId(one('commentAuthor',parent))!==job.neighbor_id)fail();
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
 // Comments start folded on a real post. Opening the list is the only click allowed before the checks, and only on the job's own post.
 if(operation==='inspect'&&['comment','reply'].includes(job.kind)&&typeof p.selectors.commentOpener==='string'){
  try{
   const u=new URL(location.href),here=u.searchParams.get('logNo')===job.post_id||u.pathname.endsWith('/'+job.post_id);
   if(here&&!list('commentList').length){const opener=list('commentOpener');if(opener.length===1){opener[0].click();for(let i=0;i<30&&!list('commentList').length;i++)await new Promise(resolve=>setTimeout(resolve,100));}}
  }catch{return {unavailable:true};}
 }
 let s;
 try{s=snapshot();}catch(error){if(operation==='inspect')return {unavailable:true};throw error;}
 let article={};
 try{
  if(job.kind!=='request'&&s.restriction==='none'){
   if(p.articleCompleteMode!=='bodyVisible'&&(typeof p.articleCompleteText!=='string'||text(one('articleComplete'))!==p.articleCompleteText))fail();
   const full=text(one('articleBody')),characters=[...full].length;if(characters<1||characters>100000)fail();
   article={articleHash:await hash(full),articleCharacters:characters};
   if(expectedArticle&&(expectedArticle.articleHash!==article.articleHash||expectedArticle.articleCharacters!==characters))fail();
  }
 }catch(error){if(operation==='inspect')return {unavailable:true};throw error;}
 if(operation==='inspect')return {...safe(s),...article};
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
    (job.kind==='reply'?commentInfo(row,'parent')===job.parent_comment_id:!commentInfo(row,'parent')));
   if(matches.length===1){effectId=commentInfo(matches[0],'id');if(/^[a-zA-Z0-9_-]{1,128}$/.test(effectId??'')){state='commented';bodyHash=await hash(job.body);}}
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
  const editable=field.getAttribute('contenteditable')==='true';
  if(field.disabled||field.readOnly||(!editable&&!['TEXTAREA','INPUT'].includes(field.tagName))||!job.body.trim()||/https?:\/\/|www\./i.test(job.body))fail();
  if(!usable(snapshot())||!freshPermit())fail();
  if(editable){
   // A rich editor listens to real editing input; a plain value write would not reach it. No retry if the text does not land exactly.
   field.focus();document.execCommand('selectAll',false);document.execCommand('insertText',false,job.body);
   if((field.innerText??field.textContent??'').trim()!==job.body.trim())fail();
  }else{
  const proto=field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(field,job.body);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));
  if(field.value!==job.body)fail();
  }
 }
 // Re-read after page input handlers before the single physical submission.
 if(!usable(snapshot())||!freshPermit()||one(buttonName,root)!==button||button.disabled)fail();
 button.click();
 // On a real post this button only opens the reaction menu; the heart inside it is what records the like.
 // Pressing a heart that is already on would cancel the like, so only an "off" heart is ever pressed, once.
 if(job.kind==='like'&&p.selectors.likeChoice!==undefined){
  let choice=[];
  for(let i=0;i<30&&!choice.length;i++){await new Promise(resolve=>setTimeout(resolve,100));choice=list('likeChoice');}
  if(choice.length!==1||!choice[0].classList.contains('off')||!freshPermit())fail();
  await new Promise(resolve=>setTimeout(resolve,400+Math.floor(Math.random()*500)));
  if(!freshPermit()||one('likeChoice')!==choice[0])fail();
  choice[0].click();
 }
 return true;
}
