import {parseNeighborPage,inspectVisibleNeighbors} from './neighbor-extractor.mjs';

export function createNeighborImporter(browser,post,identity,now=Date.now,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))) {
 let running=false,stopped=false;
 async function active(expected){
  const tabs=await browser.tabs.query({active:true,currentWindow:true});
  if(tabs.length!==1||tabs[0].id!==expected.id||tabs[0].url!==expected.url||!tabs[0].active)throw Error('읽는 동안 활성 탭이 바뀌었습니다. 자동으로 계속 읽지 않습니다.');
  const window=await browser.windows.get(tabs[0].windowId);if(!window.focused)throw Error('Edge 창이 앞에 있지 않아 목록 읽기를 멈췄습니다.');
  if(stopped)throw Error('목록 읽기를 멈췄습니다. 받은 범위는 프로그램에서 확인하고 취소할 수 있습니다.');
 }
 return async function handle(message){
  if(message.type==='neighbors_stop'){stopped=true;return {stopped:true,serverCancelled:false};}
  const who=await identity();
  const {neighborImport:previous}=await browser.storage.session.get('neighborImport');
  if(message.type==='neighbors_status'){
   if(!previous||previous.deviceId!==who.deviceId)throw Error('이 기기의 가져오기 기록이 없습니다.');
   return post('status',{id:previous.id});
  }
  if(message.type!=='neighbors_read'||message.ownerConfirmed!==true)throw Error('본인 이웃 목록 읽기·임시 전송 동의를 확인해 주세요.');
  if(running)throw Error('진행 중인 목록 읽기부터 확인해 주세요.');
  running=true;stopped=false;
  try{
   const [tab]=await browser.tabs.query({active:true,currentWindow:true});let source=parseNeighborPage(tab?.url);
   if(!source||source.blogId!==who.blogId||!Number.isInteger(tab.id))throw Error('연결한 본인 블로그의 지원되는 이웃 관리 화면을 열어 주세요.');
   let previousState=null;
   if(previous?.deviceId===who.deviceId){try{previousState=await post('status',{id:previous.id});}catch(e){if(e.status!==404)throw e;}}
   if(previousState&&['ready','confirmed'].includes(previousState.state))return previousState;
   let id;
   if(previousState?.state==='capturing'){
    if(source.page!==previousState.lastPage+1)throw Error('이전 읽기의 다음 페이지와 현재 화면이 다릅니다. 프로그램에서 이전 가져오기 상태를 확인해 주세요.');
    id=previous.id;
   }else{
    if(source.page!==1)throw Error('전체 이웃 관리 목록의 첫 페이지에서 시작해 주세요.');
    id=crypto.randomUUID();await post('start',{id,ownerConfirmed:true});
    await browser.storage.session.set({neighborImport:{id,deviceId:who.deviceId,blogId:who.blogId}});
   }
   for(let count=0;count<100;count++){
    const target={id:tab.id,url:source.url};await active(target);
    const before=await identity();if(before.deviceId!==who.deviceId||before.blogId!==who.blogId)throw Error('연결 계정이 변경됐습니다.');
    const permit=await post('reserve',{id,page:source.page});
    if(!/^[a-f0-9]{64}$/.test(permit.nonce||'')||!Number.isFinite(Date.parse(permit.validUntil))||Date.parse(permit.validUntil)<=now())throw Error('목록 읽기 허가가 만료됐습니다.');
    await active(target);
    const results=await browser.scripting.executeScript({target:{tabId:tab.id,allFrames:true},func:inspectVisibleNeighbors,args:[who.blogId]});
    const values=[...new Set(results.filter(r=>r.result?.ok).map(r=>JSON.stringify(r.result.snapshot)))];
    if(values.length!==1)throw Error('이웃 목록의 계정·관계·전체 범위를 하나로 확인하지 못했습니다. 지원 화면 검수가 필요합니다.');
    const snapshot=JSON.parse(values[0]);
    if(snapshot.url!==source.url||snapshot.page!==source.page)throw Error('현재 페이지와 읽은 목록이 다릅니다.');
    await active(target);const after=await identity();
    if(after.deviceId!==who.deviceId||after.blogId!==who.blogId||Date.parse(permit.validUntil)<=now())throw Error('읽는 동안 연결 또는 허가가 변경됐습니다.');
    const saved=await post('page',{id,nonce:permit.nonce,snapshot});
    if(['ready','confirmed'].includes(saved.state))return saved;
    const next=parseNeighborPage(snapshot.nextUrl);
    if(!next||next.blogId!==who.blogId||next.page!==source.page+1)throw Error('다음 페이지를 확인하지 못했습니다.');
    await active(target);await browser.tabs.update(tab.id,{url:next.url});
    let loaded=false;
    for(let attempt=0;attempt<100;attempt++){
     if(stopped)throw Error('목록 읽기를 멈췄습니다.');
     const current=await browser.tabs.get(tab.id);
     if((current.pendingUrl&&current.pendingUrl!==next.url)||![source.url,next.url].includes(current.url))throw Error('페이지 이동 중 주소가 변경됐습니다.');
     await active({id:tab.id,url:current.url});
     if(current.url===next.url&&current.status==='complete'){loaded=true;break;}
     await pause(100);
    }
    if(!loaded)throw Error('다음 페이지 로딩을 확인하지 못했습니다. 자동 재시도하지 않습니다.');
    source=next;
   }
   throw Error('읽기 페이지 상한에 도달했습니다. 전체 완료로 표시하지 않습니다.');
  }finally{running=false;}
 };
}
