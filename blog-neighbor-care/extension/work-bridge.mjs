import {operateVisibleNaverWork} from './work-dom.mjs';
export function createWorkBridge(browser,identity,post,now=Date.now,popupFocused=async()=>false){
 let busy=false,epoch=0,active=null,last='연결 전 · 웹에서 확장 실행 허용 필요';
 const emit=message=>{last=message;try{void Promise.resolve(browser.runtime?.sendMessage?.({type:'work_progress',message,deviceId:active?.deviceId})).catch(()=>{});}catch{}};
 const state=()=>({connected:busy&&!!active,message:last});
 async function current(binding,target,version){
  const who=await identity();if(version!==epoch||who.deviceId!==binding.deviceId||who.blogId!==binding.blogId)throw Error('연결 계정이 바뀌거나 실행을 중단했습니다.');
  const tabs=await browser.tabs.query({active:true,currentWindow:true});
  if(tabs.length!==1||tabs[0].id!==target.id||tabs[0].windowId!==target.windowId||tabs[0].url!==target.url)throw Error('현재 탭이 바뀌었습니다.');
  const w=await browser.windows.get(target.windowId);if(w.state==='minimized'||(!w.focused&&!await popupFocused(target.windowId)))throw Error('Edge 창과 현재 탭을 화면에 유지해 주세요.');
 }
 async function stop(){
  epoch++;last='실행 중단 요청 · 불확실한 작업은 기록 확인 필요';
  const {workRun}=await browser.storage.session.get('workRun'),r=active??workRun;
  if(r){try{await post('stop',{id:r.id});await browser.storage.session.remove('workRun');active=null;}catch{last='중단 응답 미확인 · 웹 작업 기록에서 결과 확인';}}
  return state();
 }
 async function status(){
  if(busy)return state();
  const result=await post('status',{});
  const labels={succeeded:'확장 확인 결과 저장 완료',uncertain:'결과 불확실 · 재등록 금지',skipped:'중단됨',failed_no_effect:'미실행 확인'};
  last=result.phase==='idle'?'진행 중인 확장 작업 없음':result.phase==='done'?`작업 기록: ${labels[result.state]??'중단/완료 확인 필요'}`:'이전 작업 결과 확인 필요 · 자동으로 다시 등록하지 않습니다.';
  return state();
 }
 async function start(){
  if(busy)throw Error('이미 현재 탭 작업을 처리하고 있습니다.');busy=true;const version=epoch;
  try{
   const binding=await identity(),tabs=await browser.tabs.query({active:true,currentWindow:true});
   if(tabs.length!==1||!Number.isInteger(tabs[0].id))throw Error('네이버 글 또는 준비된 신청 화면을 열어 주세요.');const target={id:tabs[0].id,windowId:tabs[0].windowId,url:tabs[0].url};
   await current(binding,target,version);
   let r=await post('offer',{request_id:crypto.randomUUID(),url:target.url});
   if(r.phase==='idle'){last='현재 화면에 검토 완료된 실행 대상이 없습니다.';return state();}
   if(r.phase!=='inspect'||!r.job||typeof r.nonce!=='string'||!r.profile||r.job.actor_id!==binding.blogId)throw Error('실행 준비 결과를 확인하지 못했습니다.');
   active={id:r.id,deviceId:binding.deviceId};await browser.storage.session.set({workRun:active});
   emit('진행 중 · 웹에서 승인된 작업을 받아 현재 계정·대상을 확인합니다.');
   const job=r.job,profile=r.profile;let frame;
   const script=async(operation,permit)=>{
    await current(binding,target,version);
    const results=await browser.scripting.executeScript({target:operation==='inspect'?{tabId:target.id,allFrames:true}:{tabId:target.id,frameIds:[frame]},world:'ISOLATED',func:operateVisibleNaverWork,args:[{operation,job,profile,permit}]});
    await current(binding,target,version);
    if(operation==='inspect'){
     const matches=results.filter(x=>x.result?.accountId===job.account_id&&x.result?.actorId===job.actor_id&&x.result?.neighborId===job.neighbor_id&&x.result?.postId===job.post_id);
     if(matches.length!==1||!Number.isInteger(matches[0].frameId))throw Error('현재 작업 화면을 하나로 확인하지 못했습니다.');frame=matches[0].frameId;return matches[0].result;
    }
    if(results.length!==1||results[0].frameId!==frame||results[0].error)throw Error('화면 결과 미확인');return results[0].result;
   };
   let v=await script('inspect');emit('진행 중 · 계정·대상 확인 후 실행 한도를 확인합니다.');
   r=await post('inspect',{id:active.id,nonce:r.nonce,observation:v});if(r.phase!=='recheck'||typeof r.nonce!=='string')throw Error('실행 준비 미확인');
   v=await script('inspect');r=await post('recheck',{id:active.id,nonce:r.nonce,observation:v});
   emit('진행 중 · 등록 허가와 현재 화면을 마지막으로 확인합니다.');
   if(r.phase!=='apply'||typeof r.nonce!=='string'||r.permit?.deviceId!==binding.deviceId||!Number.isSafeInteger(r.permit.generation)||Date.parse(r.permit.validUntil)<=now())throw Error('등록 허가 미확인');
   if(await script('assert')!==true)throw Error('현재 등록 조건을 확인하지 못했습니다.');
   const {workAttempts={}}=await browser.storage.session.get('workAttempts');
   const attempts=Object.fromEntries(Object.entries(workAttempts).filter(([,expires])=>Number.isFinite(expires)&&expires>now())),key=`${binding.deviceId}:${job.id}:${r.permit.generation}`;
   if(Object.hasOwn(attempts,key)||Object.keys(attempts).length>=1000)throw Error('이미 시도한 작업입니다. 결과를 확인해 주세요.');
   attempts[key]=Date.parse(job.expires_at);await browser.storage.session.set({workAttempts:attempts});
   const attempted_at=now();if(await script('apply',r.permit)!==true)throw Error('등록 시도 결과 미확인');
   emit('진행 중 · 등록 시도 후 화면 결과를 확인합니다.');
   const effect=await script('verify');emit('진행 중 · 확장 확인 결과를 웹에 저장합니다.');
   const result=await post('effect',{id:active.id,nonce:r.nonce,effect,attempted_at});
   if(result.phase!=='done'||result.state!=='succeeded')throw Error('웹 결과 저장 미확인');
   await browser.storage.session.remove('workRun');active=null;last='완료 · 확장 확인 결과를 웹 작업 기록에 저장했습니다.';
   return state();
  }catch(e){await stop();last=`${e?.message||'결과 미확인'} 자동으로 다시 등록하지 않습니다. 웹 작업 기록을 확인하세요.`;throw Error(last);}
  finally{busy=false;}
 }
 return {start,stop,status};
}
