import {readVisibleNeighborContext} from './context-reader.mjs';
import {createServerClock} from './server-clock.mjs';
export function createContextReader(browser,identity,post,popupFocused=async()=>false,readerFunction=readVisibleNeighborContext,local=Date.now){
 let pending=null,busy=false,epoch=0;
 // The service worker sleeps after about 30 idle seconds and the popup closes on any outside click. A preview must survive both until the member saves or cancels.
 const KEY=readerFunction===readVisibleNeighborContext?'contextPending':'acceptPending',session=browser.storage?.session;
 const keep=async()=>{if(!session)return;if(pending)await session.set({[KEY]:pending});else await session.remove(KEY);};
 const restore=async()=>{if(pending||!session)return;const saved=(await session.get(KEY))[KEY];if(saved)pending={...saved,epoch};};
 const current=async p=>{
  const who=await identity(),tabs=await browser.tabs.query({active:true,currentWindow:true});
  if(p.epoch!==epoch||who.deviceId!==p.deviceId||who.blogId!==p.scope.actorId||tabs.length!==1||tabs[0].id!==p.tab.id||tabs[0].url!==p.tab.url||tabs[0].windowId!==p.tab.windowId)throw Error('연결 계정 또는 현재 탭이 바뀌었습니다.');
  const w=await browser.windows.get(p.tab.windowId);if(w.state==='minimized'||(!w.focused&&!await popupFocused(p.tab.windowId)))throw Error('브라우저의 현재 탭을 화면에 유지해 주세요.');
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
   const r=await post('offer',{request_id:crypto.randomUUID(),kind,url:tabs[0].url}),clock=createServerClock(local);clock.note(r);
   if(version!==epoch||r.phase!=='read'||r.scope?.actorId!==who.blogId||typeof r.nonce!=='string')throw Error('읽기 준비 결과를 확인하지 못했습니다.');
   pending={id:r.id,nonce:r.nonce,scope:r.scope,profile:r.profile,source:r.source,deviceId:who.deviceId,tab:{id:tabs[0].id,windowId:tabs[0].windowId,url:tabs[0].url},frame:null,epoch:version,offset:clock.offset};
   const snapshot=clock.fix(await inspect(pending)),saved=await post('preview',{id:pending.id,nonce:pending.nonce,snapshot});
   if(version!==epoch||saved.phase!=='preview'||typeof saved.nonce!=='string')throw Error('미리보기 결과를 확인하지 못했습니다.');
   pending.nonce=saved.nonce;await keep();return {kind,snapshot,source:pending.source,externalActions:0};
  }catch(e){await cancel();throw e;}finally{busy=false;}
 }
 async function confirm(){
  await restore();
  if(busy||!pending)throw Error('읽기 미리보기부터 확인해 주세요.');busy=true;const p=pending;
  try{
   const snapshot=createServerClock(local,Number.isSafeInteger(p.offset)?p.offset:0).fix(await inspect(p)),r=await post('confirm',{id:p.id,nonce:p.nonce,snapshot});pending=null;await keep();
   if(r.phase!=='done')throw Error('저장 결과를 확인하지 못했습니다. 자동으로 다시 보내지 않습니다.');return r;
  }catch(e){await cancel();throw e;}finally{busy=false;}
 }
 return {preview,confirm,cancel};
}
