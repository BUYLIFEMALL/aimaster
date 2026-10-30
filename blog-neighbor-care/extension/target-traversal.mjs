export const TRAVERSAL_ALARM='bnc-approved-post-traversal';
const HOME='https://blog-neighbor-care.buylife.xyz/neighbors',ORIGIN='https://blog.naver.com/*';
/** Only server-selected, already approved post jobs. No feed scraping or AI calls. */
export function createTargetTraversal(browser,identity,work,post,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),popupFocused=async()=>false){
 let busy=false,starting=false,epoch=0,writes=Promise.resolve();
 const read=async()=>((await browser.storage.session.get('targetTraversal')).targetTraversal??null);
 const save=s=>{const version=epoch,next=writes.catch(()=>{}).then(async()=>{if(s.enabled&&version!==epoch)return;await browser.storage.session.set({targetTraversal:s});try{await browser.runtime?.sendMessage?.({type:'traversal_progress',deviceId:s.deviceId,message:s.message});}catch{}});writes=next;return next;};
 const wake=async when=>browser.alarms.create(TRAVERSAL_ALARM,{when:Math.max(now()+30000,Date.parse(when)||0),periodInMinutes:0.5});
 async function current(s){
  const who=await identity();if(who.deviceId!==s.deviceId||who.blogId!==s.blogId||!await browser.permissions.contains({origins:[ORIGIN]}))throw Error('계정 또는 대상 글 접근 허용이 바뀌었습니다.');
  const tabs=await browser.tabs.query({active:true,currentWindow:true}),w=await browser.windows.get(s.windowId),tab=await browser.tabs.get(s.tabId);
  if(tabs.length!==1||tabs[0].id!==s.tabId||tab.windowId!==s.windowId||tab.url!==s.url||w.state==='minimized'||(!w.focused&&!await popupFocused(s.windowId)))throw Error('순회 탭과 Edge 창을 화면에 유지해 주세요.');return tab;
 }
 async function status(){let s=await read();if(!s)return {enabled:false,message:'대상 글 순회 꺼짐'};
  if(s.inFlight&&!busy){const r=await work.status();const settled=r.phase==='idle'||r.phase==='done'&&['succeeded','failed_no_effect','skipped','ready'].includes(r.resultState);s={...s,enabled:false,inFlight:!settled,message:settled?'이전 작업 확인됨 · 순회는 꺼져 있습니다.':'이전 결과 확인 필요 · 자동으로 순회하지 않습니다.'};await save(s);await browser.alarms.clear(TRAVERSAL_ALARM);}
  return {enabled:s.enabled,message:s.message,remaining:s.remaining,nextDueAt:s.nextDueAt??null,resultCheckRequired:s.inFlight,tabId:s.tabId};
 }
 async function stop(){epoch++;await browser.alarms?.clear(TRAVERSAL_ALARM);const s=await read();if(!s)return {enabled:false,message:'대상 글 순회 꺼짐'};await save({...s,enabled:false,message:'순회 중단 · 진행 중 작업 결과 확인'});if(s.inFlight){try{await work.stop();}catch{}}return status();}
 async function start(confirmed){
  if(confirmed!==true||busy||starting||!browser.alarms?.create)throw Error('대상 순회 동의를 확인해 주세요.');starting=true;const version=epoch;
  try{
   const prior=await status(),running=await work.status();if(prior.enabled||prior.resultCheckRequired||running.connected||running.phase&&!['idle','done'].includes(running.phase))throw Error('이전 작업을 먼저 중단하고 결과를 확인하세요.');
   if(!await browser.permissions.contains({origins:[ORIGIN]}))throw Error('대상 네이버 글 접근을 허용해 주세요.');
   const who=await identity(),tabs=await browser.tabs.query({active:true,currentWindow:true});if(tabs.length!==1)throw Error('작업할 Edge 창을 선택하세요.');const w=await browser.windows.get(tabs[0].windowId);if(w.state==='minimized'||(!w.focused&&!await popupFocused(w.id)))throw Error('Edge 창을 화면에 유지하세요.');
   const first=await post('next',{});if(!['navigate','waiting','idle'].includes(first.phase))throw Error('웹 실행 설정·미확정 결과·승인 작업을 확인하세요.');if(version!==epoch)throw Error('시작이 취소됐습니다.');
   const tab=await browser.tabs.create({windowId:tabs[0].windowId,url:HOME,active:true});if(!Number.isInteger(tab.id)||tab.windowId!==tabs[0].windowId)throw Error('같은 Edge 창의 순회 탭을 확인하지 못했습니다.');
   if(version!==epoch)throw Error('시작이 취소됐습니다.');const started=++epoch;
   const s={enabled:true,deviceId:who.deviceId,blogId:who.blogId,tabId:tab.id,windowId:tab.windowId,url:HOME,expectedNavigation:null,navigating:false,inFlight:false,remaining:120,checksRemaining:960,expiresAt:now()+8*3600000,nextDueAt:first.nextDueAt??null,message:'순회 준비 완료 · 웹의 다음 주기 대기'};
   await save(s);if(started!==epoch)throw Error('시작이 취소됐습니다.');await wake(s.nextDueAt);if(started!==epoch){await stop();throw Error('시작이 취소됐습니다.');}return status();
  }catch(e){if(version!==epoch)await stop();throw e;}finally{starting=false;}
 }
 async function alarm(name){
  if(name!==TRAVERSAL_ALARM||busy||starting)return;busy=true;const version=epoch;let s;
  try{
   s=await read();if(!s?.enabled){await browser.alarms.clear(TRAVERSAL_ALARM);return;}
   if(s.inFlight||s.navigating)throw Error('이전 순회 결과를 확인하지 못했습니다.');
   if(now()>=s.expiresAt||s.remaining<=0||s.checksRemaining<=0){await save({...s,enabled:false,message:'순회 연결 기한·횟수 완료 · 다시 확인해 시작하세요.'});await browser.alarms.clear(TRAVERSAL_ALARM);return;}
   await current(s);if(version!==epoch)return;const next=await post('next',{});await current(s);if(version!==epoch)return;s={...s,checksRemaining:s.checksRemaining-1};
   if(['waiting','idle'].includes(next.phase)){s={...s,nextDueAt:next.nextDueAt??null,message:`웹 주기 대기 · ${next.reason??'승인 작업 없음'}`};await save(s);if(version===epoch)await wake(s.nextDueAt);return;}
   if(next.phase!=='navigate'||!['like','comment','reply'].includes(next.kind)||next.actorId!==s.blogId||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(next.jobId??''))throw Error('웹의 승인 대상을 확인하지 못했습니다.');
   const u=new URL(next.url),m=/^\/([a-z0-9_-]{1,50})\/(\d{1,30})$/.exec(u.pathname);if(u.protocol!=='https:'||u.hostname!=='blog.naver.com'||u.port||u.username||u.password||u.search||u.hash||!m||(next.kind==='reply'?m[1]!==s.blogId:m[1]===s.blogId))throw Error('승인된 대상 글 주소가 아닙니다.');
   s={...s,url:next.url,expectedNavigation:next.url,navigating:true,message:`대상 이동 중 · ${m[1]}/${m[2]}`};await save(s);if(version!==epoch)return;
   await browser.tabs.update(s.tabId,{url:next.url,active:true});let complete=false;
   for(let i=0;i<60;i++){if(version!==epoch)return;const tab=await current(s);if(tab.status==='complete'){complete=true;break;}await sleep(500);}
   if(!complete)throw Error('대상 글을 정해진 시간 안에 확인하지 못했습니다.');if(version!==epoch)return;
   s={...s,expectedNavigation:null,navigating:false,inFlight:true,message:'진행 중 · 현재 계정·글·승인 작업 재확인'};await save(s);if(version!==epoch)return;
   const result=await work.start({scheduled:true,traversal:true,jobId:next.jobId});if(version!==epoch)return;
   if(result.phase==='idle'&&['not_due','scheduled','outside_window'].includes(result.reason)){s={...s,inFlight:false,nextDueAt:result.nextDueAt??null,message:'웹 주기가 변경되어 실행 없이 대기합니다.'};}
   else if(result.phase==='done'&&result.resultState==='succeeded'){s={...s,inFlight:false,remaining:s.remaining-1,nextDueAt:result.nextDueAt??null,message:'완료 · 결과 저장 후 다음 승인 글 대기'};}
   else throw Error('대상이 바뀌었거나 실행 결과를 확인하지 못했습니다.');
   await save(s);if(version!==epoch)return;await wake(s.nextDueAt);if(version!==epoch)await browser.alarms.clear(TRAVERSAL_ALARM);
  }catch(e){if(s)await save({...s,enabled:false,message:`순회 중단 · ${e?.message??'결과 미확인'} 자동으로 재시도하지 않습니다.`});await browser.alarms.clear(TRAVERSAL_ALARM);}
  finally{busy=false;}
 }
 const invalidate=async predicate=>{const version=epoch,s=await read();if(version===epoch&&s?.enabled&&predicate(s))await stop();};
 browser.tabs.onActivated?.addListener(v=>{void invalidate(s=>v.windowId===s.windowId&&v.tabId!==s.tabId).catch(()=>{});});
 browser.tabs.onUpdated?.addListener((id,v)=>{if(v.url)void invalidate(s=>id===s.tabId&&v.url!==s.url&&v.url!==s.expectedNavigation).catch(()=>{});});
 return {start,stop,status,alarm};
}
