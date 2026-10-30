export const SCHEDULE_ALARM='bnc-current-tab-schedule';
const LABELS={not_due:'다음 주기 대기',scheduled:'웹 주기에 맞춰 첫 실행 대기',no_approved_work:'현재 글의 검토 완료 작업 없음',outside_window:'웹 실행 시간대 밖',busy:'이전 주기 처리 중'};
/** One explicitly bound, foreground tab. Session state never auto-resumes after
 * browser restart. Alarms are wakeups; server cursor decides whether to execute. */
export function createExtensionSchedule(browser,identity,work,now=Date.now,popupFocused=async()=>false){
 let busy=false,starting=false,epoch=0,writes=Promise.resolve();
 const read=async()=>((await browser.storage.session.get('scheduledWork')).scheduledWork??null);
 const save=s=>{const version=epoch;const next=writes.catch(()=>{}).then(async()=>{if(version!==epoch&&s.enabled)return;await browser.storage.session.set({scheduledWork:s});try{await browser.runtime?.sendMessage?.({type:'schedule_progress',message:s.message,deviceId:s.deviceId});}catch{}});writes=next;return next;};
 async function current(s){
  const who=await identity();if(who.deviceId!==s.deviceId||who.blogId!==s.blogId)throw Error('연결 계정이 변경됐습니다.');
  const [tab,...rest]=await browser.tabs.query({active:true,currentWindow:true});
  if(rest.length||tab?.id!==s.tabId||tab?.windowId!==s.windowId||tab?.url!==s.url)throw Error('지정한 반복 탭이 변경됐습니다.');
  const w=await browser.windows.get(s.windowId);if(w.state==='minimized'||(!w.focused&&!await popupFocused(s.windowId)))throw Error('Edge 창과 지정한 반복 탭을 화면에 유지해 주세요.');
 }
 async function status(){
  let s=await read();if(!s)return {enabled:false,message:'반복 실행 꺼짐'};
  if(s.inFlight&&!busy){const r=await work.status();if(r.phase==='idle'||(r.phase==='done'&&['succeeded','failed_no_effect','skipped','ready'].includes(r.resultState))){s={...s,inFlight:false,enabled:false,message:'이전 작업 결과 확인됨 · 반복은 꺼져 있습니다.'};await save(s);}else{s={...s,enabled:false,message:'이전 실행 결과 확인 필요 · 자동 재개하지 않습니다.'};await save(s);await browser.alarms?.clear(SCHEDULE_ALARM);}}
  return {enabled:s.enabled===true,message:s.message,remaining:s.remaining,nextDueAt:s.nextDueAt??null,resultCheckRequired:s.inFlight===true};
 }
 async function stop(){
  epoch++;await browser.alarms?.clear(SCHEDULE_ALARM);const s=await read();if(!s)return {enabled:false,message:'반복 실행 꺼짐'};
  await save({...s,enabled:false,message:'반복 실행 중단 · 진행 중인 작업 결과 확인'});
  if(s.inFlight){try{await work.stop();}catch{/* Preserve inFlight until a read-only result check. */}}
  return status();
 }
 async function startInternal(confirmed,version){
  if(confirmed!==true||busy||!browser.alarms?.create)throw Error('반복 실행 동의와 확장 지원 상태를 확인해 주세요.');
  const currentWork=await work.status();if(currentWork.connected||!['idle','done',undefined].includes(currentWork.phase))throw Error('진행 중인 작업 결과부터 확인해 주세요.');
  const previous=await status();if(previous.enabled||previous.resultCheckRequired)throw Error('기존 반복을 중단하고 이전 결과부터 확인해 주세요.');
  const who=await identity(),tabs=await browser.tabs.query({active:true,currentWindow:true});
  if(tabs.length!==1)throw Error('반복할 현재 네이버 글을 열어 주세요.');const tab=tabs[0],url=new URL(tab.url);
  if(url.protocol!=='https:'||url.hostname!=='blog.naver.com'||url.username||url.password||url.port||url.hash||!Number.isInteger(tab.id)||!Number.isInteger(tab.windowId))throw Error('네이버 글 또는 준비된 신청 화면에서 시작해 주세요.');
  const s={enabled:true,deviceId:who.deviceId,blogId:who.blogId,tabId:tab.id,windowId:tab.windowId,url:tab.url,expiresAt:now()+8*60*60*1000,remaining:120,checksRemaining:960,inFlight:false,message:'반복 준비 완료 · 웹 주기와 검토 완료 작업을 확인합니다.'};
  await current(s);if(version!==epoch)throw Error('시작 중 중단을 요청했습니다.');const started=++epoch;await save(s);if(started!==epoch)throw Error('시작이 취소됐습니다.');await browser.alarms.create(SCHEDULE_ALARM,{delayInMinutes:0.5,periodInMinutes:0.5});
  if(started!==epoch){await stop();throw Error('시작이 취소됐습니다.');}return status();
 }
 async function start(confirmed){if(starting||busy)throw Error('이미 반복 작업을 처리하고 있습니다.');starting=true;const version=epoch;try{return await startInternal(confirmed,version);}catch(e){if(version!==epoch)await stop();throw e;}finally{starting=false;}}
 async function alarm(name){
  if(name!==SCHEDULE_ALARM||busy||starting)return;busy=true;const version=epoch;let s;
  try{
   s=await read();if(!s?.enabled){await browser.alarms?.clear(SCHEDULE_ALARM);return;}
   if(s.inFlight)throw Error('이전 실행 결과를 확인하지 못했습니다.');
   if(now()>=s.expiresAt||s.remaining<=0||s.checksRemaining<=0){await save({...s,enabled:false,message:'반복 연결 기한 또는 확인 횟수 완료 · 다시 동의해 시작하세요.'});await browser.alarms.clear(SCHEDULE_ALARM);return;}
   await current(s);if(version!==epoch)return;
   s={...s,inFlight:true,checksRemaining:s.checksRemaining-1,message:'진행 중 · 웹 예약커서와 현재 글 확인'};await save(s);if(version!==epoch)return;
   const result=await work.start({scheduled:true});
   if(version!==epoch)return;
   if(result.phase==='idle'&&['disabled','result_check_required'].includes(result.reason))throw Error('웹 실행이 꺼져 있거나 이전 결과 확인이 필요합니다.');
   if(!['idle','done'].includes(result.phase)||result.phase==='done'&&result.resultState!=='succeeded')throw Error('주기 실행 결과를 확인하지 못했습니다.');
   s={...s,inFlight:false,remaining:s.remaining-(result.phase==='done'?1:0),nextDueAt:result.nextDueAt??null,message:result.phase==='done'?'완료 · 결과 저장 후 다음 웹 주기 대기':`${LABELS[result.reason]??'웹 주기 대기'}${result.nextDueAt?` · ${result.nextDueAt}`:''}`};
   await save(s);if(version!==epoch)return;
   const next=Date.parse(s.nextDueAt);if(Number.isFinite(next)&&next>now()+30000)await browser.alarms.create(SCHEDULE_ALARM,{when:next,periodInMinutes:0.5});
   if(version!==epoch)await browser.alarms.clear(SCHEDULE_ALARM);
  }catch(e){if(s){await save({...s,enabled:false,message:`중단 · ${e?.message??'결과 미확인'} 자동으로 재개하지 않습니다.`});}await browser.alarms?.clear(SCHEDULE_ALARM);}
  finally{busy=false;}
 }
 const invalidate=async predicate=>{const version=epoch,s=await read();if(version===epoch&&s?.enabled&&predicate(s))await stop();};
 browser.tabs.onActivated?.addListener(info=>{void invalidate(s=>info.windowId===s.windowId&&info.tabId!==s.tabId).catch(()=>{});});
 browser.tabs.onUpdated?.addListener((id,change)=>{if(change.url)void invalidate(s=>id===s.tabId&&change.url!==s.url).catch(()=>{});});
 return {start,stop,status,alarm};
}
