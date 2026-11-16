import {readVisibleNeighborContext} from './context-reader.mjs';
import {createServerClock} from './server-clock.mjs';
// Same URL shapes the server accepts. Catches the v1.20 C-3 slip (return-post read sent from the member's own post tab) before any server call.
export function blogPost(url){
 try{const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='blog.naver.com')return null;
  const m=/^\/([a-z0-9_-]{1,50})(?:\/(\d{1,30}))?\/?$/.exec(u.pathname);
  if(m&&!u.search)return {owner:m[1],post:m[2]??''};
  if(u.pathname==='/PostView.naver')return {owner:u.searchParams.get('blogId')??'',post:u.searchParams.get('logNo')??''};
 }catch{}return null;
}
function checkTarget(kind,url,blogId){
 const t=blogPost(url);if(kind==='relationship')return;
 const local=message=>Object.assign(Error(message),{stage:'tab'});
 if(kind==='return_post'&&(!t||!t.post||t.owner===blogId))throw local('답방 글은 이웃의 글 화면(blog.naver.com/이웃ID/글번호)을 연 탭에서 읽어 주세요. 지금 탭은 '+(t&&t.owner===blogId?'내 블로그':'이웃 글 화면이 아닙니다')+'.');
 if(kind==='incoming'&&(!t||!t.post||t.owner!==blogId))throw local('원댓글은 내 블로그 글 화면(blog.naver.com/'+blogId+'/글번호)을 연 탭에서 읽어 주세요.');
}
const FOCUS_PROBE={ok:'활성','no-reply':'응답 없음','other-window':'다른 창',unfocused:'비활성',hidden:'화면에 안 보임',error:'오류','no-runtime':'메시지 불가'};
export function createContextReader(browser,identity,post,popupFocused=async()=>false,readerFunction=readVisibleNeighborContext,local=Date.now){
 let pending=null,busy=false,epoch=0;
 // 2026-11-14: tag the failing call so the popup can show offer/preview/confirm with the HTTP status and BNC code.
 const step=(op,p)=>post(op,p).catch(e=>{if(e&&typeof e==='object'&&!e.stage)e.stage=op;throw e;});
 // The service worker sleeps after about 30 idle seconds and the popup closes on any outside click. A preview must survive both until the member saves or cancels.
 const KEY=readerFunction===readVisibleNeighborContext?'contextPending':'acceptPending',session=browser.storage?.session;
 const keep=async()=>{if(!session)return;if(pending)await session.set({[KEY]:pending});else await session.remove(KEY);};
 const restore=async()=>{if(pending||!session)return;const saved=(await session.get(KEY))[KEY];if(saved)pending={...saved,epoch};};
 const current=async p=>{
  const who=await identity(),tabs=await browser.tabs.query({active:true,currentWindow:true});
  if(p.epoch!==epoch||who.deviceId!==p.deviceId||who.blogId!==p.scope.actorId||tabs.length!==1||tabs[0].id!==p.tab.id||tabs[0].url!==p.tab.url||tabs[0].windowId!==p.tab.windowId)throw Object.assign(Error('연결 계정 또는 현재 탭이 바뀌었습니다.'),{stage:'tab'});
  // 2026-11-15: an agent-driven click (e.g. ego lite under automation) leaves both the window and the popup unfocused; this guard must keep rejecting it. The 'focus' stage tells that apart from a server-side refusal.
  const w=await browser.windows.get(p.tab.windowId),minimized=w.state==='minimized';
  if(minimized||(!w.focused&&!await popupFocused(p.tab.windowId))){
   // 2026-11-16 B-1: a human click on the Mac was also refused, so name which check failed. Only window/popup state, never page, account or body.
   const probe=!minimized&&typeof popupFocused.detail==='function'?popupFocused.detail():'';
   const detail=`창 ${minimized?'최소화':w.focused?'활성':'비활성'} · 팝업 ${FOCUS_PROBE[probe]||'확인 안 함'}`;
   throw Object.assign(Error(`브라우저의 현재 탭을 화면에 유지해 주세요. (진단: ${detail})`),{stage:'focus',detail});
  }
 };
 const inspect=async p=>{
  await current(p);
  const results=await browser.scripting.executeScript({target:p.frame===null?{tabId:p.tab.id,allFrames:true}:{tabId:p.tab.id,frameIds:[p.frame]},world:'ISOLATED',func:readerFunction,args:[{scope:p.scope,profile:p.profile}]});
  await current(p);const matches=results.filter(x=>x.result?.accountId===p.scope.accountId&&x.result?.actorId===p.scope.actorId);
  if(matches.length!==1||!Number.isInteger(matches[0].frameId))throw Error('읽기 화면을 하나로 확인하지 못했습니다.');
  p.frame=matches[0].frameId;return matches[0].result;
 };
 async function cancel(recover=false){await restore();epoch++;let p=pending;pending=null;await keep();if(!p&&recover){try{const r=await post('status',{});if(r.id)p=r;}catch{}}if(p){try{await post('cancel',{id:p.id});}catch{}}return {cancelled:true,externalActions:0};}
 async function preview(kind){
  await restore();
  if(busy||pending)throw Error('이전 읽기 내용을 확인하거나 취소해 주세요.');busy=true;const version=epoch;
  try{
   const who=await identity(),tabs=await browser.tabs.query({active:true,currentWindow:true});if(tabs.length!==1)throw Error('읽을 네이버 화면을 열어 주세요.');
   checkTarget(kind,tabs[0].url,who.blogId);
   const r=await step('offer',{request_id:crypto.randomUUID(),kind,url:tabs[0].url}),clock=createServerClock(local);clock.note(r);
   if(version!==epoch||r.phase!=='read'||r.scope?.actorId!==who.blogId||typeof r.nonce!=='string')throw Error('읽기 준비 결과를 확인하지 못했습니다.');
   pending={id:r.id,nonce:r.nonce,scope:r.scope,profile:r.profile,source:r.source,deviceId:who.deviceId,tab:{id:tabs[0].id,windowId:tabs[0].windowId,url:tabs[0].url},frame:null,epoch:version,offset:clock.offset};
   const snapshot=clock.fix(await inspect(pending)),saved=await step('preview',{id:pending.id,nonce:pending.nonce,snapshot});
   if(version!==epoch||saved.phase!=='preview'||typeof saved.nonce!=='string')throw Error('미리보기 결과를 확인하지 못했습니다.');
   pending.nonce=saved.nonce;await keep();return {kind,snapshot,source:pending.source,externalActions:0};
  }catch(e){await cancel();throw e;}finally{busy=false;}
 }
 async function confirm(){
  await restore();
  if(busy||!pending)throw Error('읽기 미리보기부터 확인해 주세요.');busy=true;const p=pending;
  try{
   const snapshot=createServerClock(local,Number.isSafeInteger(p.offset)?p.offset:0).fix(await inspect(p)),r=await step('confirm',{id:p.id,nonce:p.nonce,snapshot});pending=null;await keep();
   if(r.phase!=='done')throw Error('저장 결과를 확인하지 못했습니다. 자동으로 다시 보내지 않습니다.');return r;
  }catch(e){await cancel();throw e;}finally{busy=false;}
 }
 return {preview,confirm,cancel};
}
