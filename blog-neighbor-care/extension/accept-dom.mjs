// Reviewed native management selectors only. No default Naver paths/selectors.
export async function operateIncomingRequests({scope,profile:p,operation='read',job,validUntil}){
 const unavailable=()=>({unavailable:true});
 try{
  const actor=scope?.actorId??job?.actorId,account=scope?.accountId??job?.accountId;
  if(p?.v!==1||p.reviewed!==true||!p.reference?.trim()||!/^\/[A-Za-z0-9_-]+\.naver$/.test(p.incomingRequestPath??''))return unavailable();
  const visible=e=>e?.isConnected&&e.getClientRects().length>0&&!e.closest('[hidden],[aria-hidden="true"]');
  const list=(key,root=document)=>{const selector=p.selectors?.[key];if(typeof selector!=='string'||!selector.trim()||selector.length>256)throw Error();return [...root.querySelectorAll(selector)].filter(visible);};
  const one=(key,root=document)=>{const a=list(key,root);if(a.length!==1)throw Error();return a[0];};
  const text=e=>(e.innerText??e.textContent??e.value??'').trim();
  const author=e=>{const u=new URL(e.getAttribute('href'),location.href),m=/^\/([a-z0-9_-]{1,50})\/?$/.exec(u.pathname);return u.protocol==='https:'&&u.hostname==='blog.naver.com'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&m?m[1]:null;};
  const snapshot=()=>{
   const u=new URL(location.href);if(document.visibilityState!=='visible'||u.protocol!=='https:'||u.hostname!=='admin.blog.naver.com'||u.port||u.username||u.password||u.hash||u.pathname!==p.incomingRequestPath||u.searchParams.getAll('blogId').length!==1||u.searchParams.get('blogId')!==actor||(p.incomingOwnerFromPath!==true&&author(one('ownerLink'))!==actor))throw Error();
   const restriction=list('captcha').length?'captcha':list('login').length?'login':list('platformRestriction').length?'platform':'none';
   const base={accountId:account,actorId:actor,checkedAt:Date.now(),restriction};if(restriction!=='none')return {base,rows:[]};
   const realRows=p.requestIdField===true;
   if(!realRows&&(!p.requestsCompleteText||text(one('requestsComplete'))!==p.requestsCompleteText||!/^data-[a-z0-9-]{1,40}$/.test(p.requestIdAttribute??'')))throw Error();
   const rows=list('requestRow',one('requestList'));if(rows.length>500)throw Error();
   // On the real page the row's own checkbox holds the sender's blog id, and every listed row is still waiting.
   const records=rows.map(row=>{if(realRows){const id=one('requestIdInput',row).getAttribute('value');return {row,requestId:id,neighborId:/^[a-z0-9_-]{1,50}$/.test(id??'')?id:null,state:'pending'};}return {row,requestId:row.getAttribute(p.requestIdAttribute),neighborId:author(one('requestAuthor',row)),state:p.incomingRequestStateMap?.[text(one('requestState',row))]};});
   if(records.some(r=>!/^[a-zA-Z0-9_-]{1,128}$/.test(r.requestId??'')||!r.neighborId||r.neighborId===actor||!['pending','mutual'].includes(r.state))||new Set(records.map(r=>r.requestId)).size!==records.length)throw Error();return {base,rows:records};
  };
  let s=snapshot();
  if(operation==='read'){
   if(s.base.restriction!=='none')return s.base;const requests=s.rows.filter(r=>r.state==='pending').map(({requestId,neighborId,state})=>({requestId,neighborId,state})).sort((a,b)=>a.requestId.localeCompare(b.requestId));if(requests.length>50)return unavailable();return {...s.base,complete:true,requests,count:requests.length};
  }
  if(!job||!['inspect','apply','verify'].includes(operation)||Date.parse(job.expiresAt)<=Date.now())return unavailable();
  if(operation==='verify')for(let i=0;i<20&&s.base.restriction==='none'&&!s.rows.some(r=>r.requestId===job.requestId&&r.neighborId===job.neighborId&&r.state==='mutual')&&(p.requestIdField!==true||s.rows.some(r=>r.requestId===job.requestId));i++){await new Promise(r=>setTimeout(r,100));s=snapshot();}
  // The real list drops an accepted row. Only a read taken after this run's own click may count that as accepted.
  if(operation==='verify'&&p.requestIdField===true&&s.base.restriction==='none'&&!s.rows.some(r=>r.requestId===job.requestId))return {...s.base,requestId:job.requestId,neighborId:job.neighborId,state:'mutual'};
  if(s.base.restriction!=='none')return {...s.base,requestId:job.requestId,neighborId:job.neighborId,state:'pending'};
  const matches=s.rows.filter(r=>r.requestId===job.requestId&&r.neighborId===job.neighborId);if(matches.length!==1)return unavailable();const row=matches[0];
  if(operation!=='apply')return {...s.base,requestId:row.requestId,neighborId:row.neighborId,state:row.state};
  if(row.state!=='pending'||!Number.isFinite(Date.parse(validUntil))||Date.parse(validUntil)<=Date.now()||Date.parse(validUntil)>Date.now()+30000)return unavailable();
  const button=one('requestAccept',row.row);if(button.disabled||button.getAttribute('aria-disabled')==='true'||!['BUTTON','INPUT'].includes(button.tagName)||!p.requestAcceptText||text(button)!==p.requestAcceptText)return unavailable();
  button.click();return true;
 }catch{return unavailable();}
}
// Naver finishes an acceptance in a small window of its own: pick a group, press confirm, then read one line of result.
// The member's default group stays as Naver selected it. Runs inside that window only, and only for this job's sender.
export function operateAcceptPopup({operation,job,profile:p}){
 try{
  const u=new URL(location.href);if(u.protocol!=='https:'||u.hostname!=='admin.blog.naver.com'||u.port||u.username||u.password||u.hash||u.pathname!==p?.acceptPopupPath)return {unavailable:true};
  const sel=key=>{const s=p.selectors?.[key];if(typeof s!=='string'||!s.trim()||s.length>256)throw Error();return [...document.querySelectorAll(s)];};
  if(operation==='result'){const done=sel('acceptPopupDone');return {done:done.length===1&&!!p.acceptPopupDoneText&&(done[0].textContent??'').includes(p.acceptPopupDoneText)};}
  if(operation!=='confirm')return {unavailable:true};
  const field=name=>document.querySelector('form[name="buddyFrm"] input[name="'+name+'"]')?.getAttribute('value');
  if(field('blogId')!==job.actorId||field('targetBlogId')!==job.neighborId||field('acceptyn')!=='true')return {unavailable:true};
  const submit=sel('acceptPopupSubmit');if(submit.length!==1)return {unavailable:true};submit[0].click();return {clicked:true};
 }catch{return {unavailable:true};}
}
