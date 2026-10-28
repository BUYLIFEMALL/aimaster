import {parseNeighborPage,inspectVisibleNeighbors,advanceVisibleNeighborPage,neighborPageReady} from './neighbor-extractor.mjs';

export function createNeighborImporter(browser,post,identity,now=Date.now,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),onProgress=async()=>{},popupFocused=async()=>false) {
 let running=false,stopped=false,progress=null;
 const emit=async(stage,patch={})=>{
  progress={...progress,...patch,stage,state:['ready','confirmed'].includes(stage)?'complete':['failed','paused'].includes(stage)?'stopped':'running',updatedAt:new Date(now()).toISOString()};
  try{await onProgress({...progress});}catch{/* Display failures must not repeat or authorize a read. */}
 };
 const receiptFields=r=>({importId:r.id,capturedCount:r.capturedCount??0,totalCount:r.totalCount??progress?.totalCount??null,totalPages:r.totalPages??progress?.totalPages??null,lastPage:r.lastPage??progress?.lastPage??0});
 async function active(expected){
  const tabs=await browser.tabs.query({active:true,currentWindow:true});
  if(tabs.length!==1||tabs[0].id!==expected.id||tabs[0].url!==expected.url||!tabs[0].active)throw Error('읽는 동안 활성 탭이 바뀌었습니다. 자동으로 계속 읽지 않습니다.');
  const window=await browser.windows.get(tabs[0].windowId);
  if(window.state==='minimized')throw Error('Edge 창이 최소화되어 읽기를 멈췄습니다.');
  const ownPopupFocused=!window.focused&&await popupFocused(tabs[0].windowId);
  if(progress)progress.focusCheck={browserFocused:!!window.focused,ownPopupFocused:!!ownPopupFocused};
  if(!window.focused&&!ownPopupFocused)throw Error('Edge 본창과 확장 팝업의 활성 상태를 확인하지 못해 읽기를 멈췄습니다.');
  if(stopped)throw Error('목록 읽기를 멈췄습니다. 받은 범위는 프로그램에서 확인하고 취소할 수 있습니다.');
 }
 const handle=async function(message){
  if(message.type==='neighbors_stop'){stopped=true;if(running)await emit('stopping',{message:'읽기 중단 요청을 처리하고 있습니다.'});return {stopped:true,serverCancelled:false};}
  const who=await identity();
  const {neighborImport:previous}=await browser.storage.session.get('neighborImport');
  if(message.type==='neighbors_status'){
   if(!previous||previous.deviceId!==who.deviceId)throw Error('이 기기의 가져오기 기록이 없습니다.');
   const r=await post('status',{id:previous.id});progress={deviceId:who.deviceId,...receiptFields(r)};
   await emit(['ready','confirmed'].includes(r.state)?r.state:running?'received':'paused',{message:r.state==='ready'?'전체 목록을 임시 수신했습니다. 프로그램에서 확인·반영해 주세요.':r.state==='confirmed'?'프로그램에 확인·반영을 완료했습니다.':r.state==='expired'?'이전 목록의 확인 기한이 지났습니다. 네이버 이웃 관리 탭에서 동의 후 전체 이웃 목록 읽기를 눌러 주세요.':`서버 상태: ${r.state}. 받은 범위를 확인해 주세요.`});return r;
  }
  if(message.type!=='neighbors_read'||message.ownerConfirmed!==true)throw Error('본인 이웃 목록 읽기·임시 전송 동의를 확인해 주세요.');
  if(running)throw Error('진행 중인 목록 읽기부터 확인해 주세요.');
  running=true;stopped=false;
  progress={deviceId:who.deviceId,capturedCount:0,totalCount:null,totalPages:null,lastPage:0};
  try{
   await emit('checking',{message:'본인 계정과 현재 탭을 확인하고 있습니다.'});
   const [tab]=await browser.tabs.query({active:true,currentWindow:true});let source=parseNeighborPage(tab?.url);
   if(!source||source.blogId!==who.blogId||!Number.isInteger(tab.id))throw Error('연결한 본인 블로그의 지원되는 이웃 관리 화면을 열어 주세요.');
   let previousState=null;
   if(previous?.deviceId===who.deviceId){try{previousState=await post('status',{id:previous.id});}catch(e){if(e.status!==404)throw e;}}
   if(previousState&&['ready','confirmed'].includes(previousState.state)){await emit(previousState.state,receiptFields(previousState));return previousState;}
   let id;
   if(previousState?.state==='capturing'){
    if(source.kind==='shell')source={...source,page:previousState.lastPage+1};
    else if(source.page!==previousState.lastPage+1)throw Error('이전 읽기의 다음 페이지와 현재 화면이 다릅니다. 프로그램에서 이전 가져오기 상태를 확인해 주세요.');
    id=previous.id;Object.assign(progress,receiptFields(previousState));
   }else{
    if(source.page!==1)throw Error('전체 이웃 관리 목록의 첫 페이지에서 시작해 주세요.');
    id=crypto.randomUUID();await emit('starting',{message:'가져오기 요청을 준비하고 있습니다.'});await post('start',{id,ownerConfirmed:true});
    await browser.storage.session.set({neighborImport:{id,deviceId:who.deviceId,blogId:who.blogId}});
   }
   progress.importId=id;
   let queuedPermit=null;
   for(let count=0;count<100;count++){
    const target={id:tab.id,url:source.url};await active(target);
    const before=await identity();if(before.deviceId!==who.deviceId||before.blogId!==who.blogId)throw Error('연결 계정이 변경됐습니다.');
    await emit('reserving',{page:source.page,message:`${source.page}페이지 읽기 권한을 확인하고 있습니다.`});
    const permit=queuedPermit??await post('reserve',{id,page:source.page});queuedPermit=null;
    if(!/^[a-f0-9]{64}$/.test(permit.nonce||'')||!Number.isFinite(Date.parse(permit.validUntil))||Date.parse(permit.validUntil)<=now())throw Error('목록 읽기 허가가 만료됐습니다.');
    await active(target);
    await emit('reading',{message:`${source.page}페이지의 이웃 목록을 읽고 있습니다.`});
    const results=await browser.scripting.executeScript({target:{tabId:tab.id,allFrames:true},func:inspectVisibleNeighbors,args:[who.blogId]});
    const matches=results.filter(r=>r.result?.ok&&r.result.snapshot);
    if(matches.length!==1)throw Error('이웃 목록의 계정·관계·전체 범위를 하나로 확인하지 못했습니다. 지원 화면 검수가 필요합니다.');
    const snapshot=matches[0].result.snapshot,captured=parseNeighborPage(snapshot.url);
    if(!captured||captured.kind==='shell'||captured.blogId!==who.blogId||snapshot.page!==source.page)throw Error('현재 페이지와 읽은 목록이 다릅니다.');
    if(source.kind==='shell'){
      const contexts=results.filter(r=>r.result?.ok&&r.result.context?.url===source.url&&r.result.context.blogId===who.blogId);
      if(contexts.length!==1||captured.kind!=='list')throw Error('상위 관리 화면과 이웃 목록 계정을 함께 확인하지 못했습니다.');
    }else if(snapshot.url!==source.url)throw Error('현재 페이지와 읽은 목록이 다릅니다.');
    await active(target);const after=await identity();
    if(after.deviceId!==who.deviceId||after.blogId!==who.blogId||Date.parse(permit.validUntil)<=now())throw Error('읽는 동안 연결 또는 허가가 변경됐습니다.');
    await emit('sending',{totalCount:snapshot.totalCount,totalPages:snapshot.totalPages,message:`${source.page}페이지를 서버로 전송하고 있습니다.`});
    const saved=await post('page',{id,nonce:permit.nonce,snapshot});
    await emit(['ready','confirmed'].includes(saved.state)?saved.state:'received',{...receiptFields(saved),lastPage:saved.lastPage??source.page,message:saved.state==='ready'?'전체 목록을 임시 수신했습니다. 아직 프로그램에 반영하기 전입니다.':saved.state==='confirmed'?'프로그램에 확인·반영을 완료했습니다.':`${source.page}페이지 수신을 확인했습니다.`});
    if(['ready','confirmed'].includes(saved.state))return saved;
    const next=parseNeighborPage(snapshot.nextUrl);
    if(!next||next.blogId!==who.blogId||next.page!==source.page+1)throw Error('다음 페이지를 확인하지 못했습니다.');
    // Reserve the next page before navigating: loading a page is already a read.
    queuedPermit=await post('reserve',{id,page:next.page});
    if(!/^[a-f0-9]{64}$/.test(queuedPermit.nonce||'')||!Number.isFinite(Date.parse(queuedPermit.validUntil))||Date.parse(queuedPermit.validUntil)<=now())throw Error('다음 페이지 읽기 허가를 확인하지 못했습니다.');
    await active(target);
    const beforeNavigation=await identity();
    if(beforeNavigation.deviceId!==who.deviceId||beforeNavigation.blogId!==who.blogId||Date.parse(queuedPermit.validUntil)<=now())throw Error('다음 페이지 이동 전에 연결 또는 허가가 변경됐습니다.');
    if(source.kind==='shell'){
      const advanced=await browser.scripting.executeScript({target:{tabId:tab.id,allFrames:true},func:advanceVisibleNeighborPage,args:[who.blogId,snapshot.url,next.url]});
      if(advanced.filter(r=>r.result?.advanced).length!==1)throw Error('검증된 다음 목록 링크를 하나로 확인하지 못했습니다.');
    }else await browser.tabs.update(tab.id,{url:next.url});
    let loaded=false;
    for(let attempt=0;attempt<100;attempt++){
     if(stopped)throw Error('목록 읽기를 멈췄습니다.');
     const current=await browser.tabs.get(tab.id);
     if(source.kind==='shell'){
       await active(target);
       const frames=await browser.scripting.executeScript({target:{tabId:tab.id,allFrames:true},func:neighborPageReady,args:[next.url]});
       if(frames.filter(r=>r.result?.ready).length===1){loaded=true;break;}
       await pause(100);continue;
     }
     if((current.pendingUrl&&current.pendingUrl!==next.url)||![source.url,next.url].includes(current.url))throw Error('페이지 이동 중 주소가 변경됐습니다.');
     await active({id:tab.id,url:current.url});
     if(current.url===next.url&&current.status==='complete'){loaded=true;break;}
     await pause(100);
    }
    if(!loaded)throw Error('다음 페이지 로딩을 확인하지 못했습니다. 자동 재시도하지 않습니다.');
    source=source.kind==='shell'?{...source,page:next.page}:next;
   }
   throw Error('읽기 페이지 상한에 도달했습니다. 전체 완료로 표시하지 않습니다.');
  }catch(error){await emit('failed',{message:error?.message||'읽기를 완료하지 못했습니다. 받은 범위를 확인해 주세요.'});throw error;}
  finally{running=false;}
 };
 handle.isRunning=()=>running;
 return handle;
}
