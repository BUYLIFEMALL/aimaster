// Serialized in the isolated world. Reads only; no clicks, input, fetch,
// article/comment body collection or browser storage access.
export function readVisibleNeighborContext({scope,profile:p}){
 const unavailable=()=>({unavailable:true});
 try{
  if(!scope||!['relationship','incoming','return_post'].includes(scope.kind)||p?.v!==1||p.reviewed!==true||!p.reference?.trim()||document.visibilityState!=='visible')return unavailable();
  const visible=e=>e?.isConnected&&e.getClientRects().length>0&&!e.closest('[hidden],[aria-hidden="true"]');
  const list=(key,root=document)=>{const s=p.selectors?.[key];if(typeof s!=='string'||!s.trim()||s.length>256)throw Error();return [...root.querySelectorAll(s)].filter(visible);};
  const one=(key,root=document)=>{const a=list(key,root);if(a.length!==1)throw Error();return a[0];};
  const text=e=>(e.innerText??e.textContent??'').trim();
  const author=e=>{try{const u=new URL(e.getAttribute('href'),location.href),m=/^\/([a-z0-9_-]{1,50})\/?$/.exec(u.pathname);return u.protocol==='https:'&&u.hostname==='blog.naver.com'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&m?m[1]:null;}catch{return null;}};
  const attr=key=>{const a=p[key];if(typeof a!=='string'||!/^(id|data-[a-z0-9-]{1,40})$/.test(a))throw Error();return a;};
  const ownerId=()=>{const v=p.ownerScriptVar;if(v===undefined)return author(one('ownerLink'));if(typeof v!=='string'||!/^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(v))throw Error();const re=new RegExp('\\b'+v+'\\s*=\\s*["\']([a-z0-9_-]{1,50})["\']');const found=new Set();for(const s of document.querySelectorAll('script')){const m=re.exec(s.textContent??'');if(m)found.add(m[1]);}return found.size===1?[...found][0]:null;};
  const info=(row,key)=>{const a=p.commentInfoAttribute;if(a===undefined)return key==='id'?row.getAttribute(attr('commentIdAttribute')):row.getAttribute(attr('parentIdAttribute'))??'';
   if(typeof a!=='string'||!/^data-[a-z0-9-]{1,40}$/.test(a))throw Error();const s=row.getAttribute(a)??'';
   if(key==='id')return /\bcommentNo:'(\d{1,30})'/.exec(s)?.[1]??null;return /\breplyLevel:1\b/.test(s)?'':/\bparentCommentNo:'(\d{1,30})'/.exec(s)?.[1]??'';};
  const u=new URL(location.href);if(u.protocol!=='https:'||u.hostname!=='blog.naver.com'||u.username||u.password||u.port||u.hash)return unavailable();
  let owner,post='';const m=/^\/([a-z0-9_-]{1,50})(?:\/(\d{1,30}))?\/?$/.exec(u.pathname);
  if(m&&!u.search){owner=m[1];post=m[2]??'';}else if(u.pathname==='/PostView.naver'&&u.searchParams.getAll('blogId').length===1&&u.searchParams.getAll('logNo').length===1){owner=u.searchParams.get('blogId');post=u.searchParams.get('logNo');}
  if(owner!==scope.targetOwner||post!==scope.postId||ownerId()!==scope.actorId)return unavailable();
  const restriction=list('captcha').length?'captcha':list('login').length?'login':list('platformRestriction').length?'platform':'none';
  const base={accountId:scope.accountId,actorId:scope.actorId,checkedAt:Date.now(),restriction};
  if(restriction!=='none')return {...base,blocked:true};
  if(scope.kind==='relationship'){
   const rel=list('relationship');const value=rel.length===1&&Object.hasOwn(p.relationshipMap??{},text(rel[0]))?p.relationshipMap[text(rel[0])]:'unknown';
   return {...base,neighborId:owner,relationship:['pending','mutual','removed'].includes(value)?value:'unknown'};
  }
  if(!/^\d{1,30}$/.test(post??''))return unavailable();
  if(scope.kind==='return_post')return {...base,neighborId:owner,postId:post};
  if(owner!==scope.actorId)return unavailable();
  if(p.commentsCompleteMode==='singlePage'){if(list('commentPageLink').length)return unavailable();}else{const complete=list('commentsComplete');if(complete.length!==1||typeof p.completeText!=='string'||!p.completeText||text(complete[0])!==p.completeText)return unavailable();}
  const rows=list('commentRow',one('commentList'));if(rows.length>500)return unavailable();
  const data=rows.map(row=>({commentId:info(row,'id'),parentId:info(row,'parent'),neighborId:author(one('commentAuthor',row))}));
  if(data.some(r=>!/^[a-zA-Z0-9_-]{1,128}$/.test(r.commentId??'')||!r.neighborId)||new Set(data.map(r=>r.commentId)).size!==data.length)return unavailable();
  const comments=data.filter(r=>!r.parentId&&r.neighborId!==scope.actorId).map(r=>({commentId:r.commentId,neighborId:r.neighborId,parentIsTopLevel:true,
   alreadyReplied:data.some(child=>child.parentId===r.commentId&&child.neighborId===scope.actorId)}));
  if(comments.length>50)return unavailable();
  return {...base,ownPostId:post,complete:true,comments,count:comments.length};
 }catch{return unavailable();}
}
