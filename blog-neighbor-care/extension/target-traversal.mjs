export const TRAVERSAL_ALARM='bnc-approved-post-traversal';
// v1.18 C-2 (6): 순회 탭은 설명 화면 「🤖 자동 실행 중」으로 연다(이전: 설명 없는 /neighbors).
const HOME='https://blog-neighbor-care.buylife.xyz/run',ORIGIN='https://blog.naver.com/*';
const LIFETIME=24*3600000;
const clock=at=>{const t=Date.parse(at);return Number.isFinite(t)?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(t)):'';};
// 서버가 알려 준 대기 이유를 회원이 읽을 수 있는 한 줄로(v1.18 C-2 (4) 시간대 밖이면 언제 시작하는지).
export function waitingMessage(reason,nextDueAt){
 const at=clock(nextDueAt);
 if(reason==='outside_window')return `지금은 동작 시간대 밖 · ${at?`${at}에 시작합니다`:'시간대가 되면 시작합니다'}`;
 if(reason==='paused')return '전체 일시정지 중 · 프로그램에서 「다시 시작」을 누르면 이어집니다';
 if(reason==='not_due'||reason==='scheduled')return `다음 실행 ${at||'주기 대기'}`;
 if(reason==='no_approved_work')return '실행할 승인 작업 없음 · 새 글을 기다립니다';
 if(reason==='result_check_required')return '이전 작업 결과 확인 필요 · 작업 기록을 확인해 주세요';
 return `대기 · ${reason??'승인 작업 없음'}`;
}
/** Only server-selected, already approved post jobs. No feed scraping or AI calls. */
export function createTargetTraversal(browser,identity,work,post,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),popupFocused=async()=>false){
 let busy=false,starting=false,epoch=0,writes=Promise.resolve();
 const read=async()=>((await browser.storage.session.get('targetTraversal')).targetTraversal??null);
 const save=s=>{const version=epoch,next=writes.catch(()=>{}).then(async()=>{if(s.enabled&&version!==epoch)return;await browser.storage.session.set({targetTraversal:s});try{await browser.runtime?.sendMessage?.({type:'traversal_progress',deviceId:s.deviceId,message:s.message});}catch{}});writes=next;return next;};
 const wake=async when=>browser.alarms.create(TRAVERSAL_ALARM,{when:Math.max(now()+30000,Date.parse(when)||0),periodInMinutes:0.5});
 // 계정·허용·탭이 바뀌었으면 멈춘다. 탭이 앞에 없거나 창이 최소화된 것은 멈춤 사유가 아니라 「잠시 멈춤」이다(v1.18 C-2 (1)).
 async function check(s){
  const who=await identity();if(who.deviceId!==s.deviceId||who.blogId!==s.blogId||!await browser.permissions.contains({origins:[ORIGIN]}))throw Error('계정 또는 대상 글 접근 허용이 바뀌었습니다.');
  const tab=await browser.tabs.get(s.tabId);if(tab.windowId!==s.windowId)throw Error('순회 탭이 다른 창으로 옮겨졌습니다.');return tab;
 }
 async function front(s){
  const tab=await check(s);if(tab.url!==s.url)throw Error('순회 탭의 주소가 바뀌었습니다.');
  const tabs=await browser.tabs.query({active:true,windowId:s.windowId}),w=await browser.windows.get(s.windowId);
  return tabs.length===1&&tabs[0].id===s.tabId&&w.state!=='minimized';
 }
 const HOLD='잠시 멈춤 · 「🤖 자동 실행 중」 탭을 앞에 두면 이어집니다(브라우저 창은 최소화하지 마세요)';
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
   const who=await identity(),tabs=await browser.tabs.query({active:true,currentWindow:true});if(tabs.length!==1)throw Error('작업할 브라우저 창을 선택하세요.');const w=await browser.windows.get(tabs[0].windowId);if(w.state==='minimized')throw Error('브라우저 창을 최소화하지 마세요.');
   const first=await post('next',{});if(!['navigate','waiting','idle'].includes(first.phase))throw Error('웹 실행 설정·미확정 결과·승인 작업을 확인하세요.');if(version!==epoch)throw Error('시작이 취소됐습니다.');
   const tab=await browser.tabs.create({windowId:tabs[0].windowId,url:HOME,active:true});if(!Number.isInteger(tab.id)||tab.windowId!==tabs[0].windowId)throw Error('같은 브라우저 창의 순회 탭을 확인하지 못했습니다.');
   if(version!==epoch)throw Error('시작이 취소됐습니다.');const started=++epoch;
   const ready=first.phase==='navigate'?'순회 준비 완료 · 곧 첫 대상 글을 엽니다':waitingMessage(first.reason,first.nextDueAt);
   const s={enabled:true,deviceId:who.deviceId,blogId:who.blogId,tabId:tab.id,windowId:tab.windowId,url:HOME,expectedNavigation:null,navigating:false,inFlight:false,remaining:120,checksRemaining:960,expiresAt:now()+LIFETIME,nextDueAt:first.nextDueAt??null,message:ready};
   await save(s);if(started!==epoch)throw Error('시작이 취소됐습니다.');await wake(s.nextDueAt);if(started!==epoch){await stop();throw Error('시작이 취소됐습니다.');}return status();
  }catch(e){if(version!==epoch)await stop();throw e;}finally{starting=false;}
 }
 async function alarm(name){
  if(name!==TRAVERSAL_ALARM||busy||starting)return;busy=true;const version=epoch;let s;
  try{
   s=await read();if(!s?.enabled){await browser.alarms.clear(TRAVERSAL_ALARM);return;}
   if(s.inFlight||s.navigating)throw Error('이전 순회 결과를 확인하지 못했습니다.');
   if(now()>=s.expiresAt||s.remaining<=0||s.checksRemaining<=0){await save({...s,enabled:false,message:'순회 연결 기한·횟수 완료 · 다시 확인해 시작하세요.'});await browser.alarms.clear(TRAVERSAL_ALARM);return;}
   // 탭이 가려져 있으면 서버에 묻지도 않고 1분 뒤 다시 본다(횟수를 쓰지 않음).
   if(!await front(s)){if(s.message!==HOLD){s={...s,message:HOLD};await save(s);}if(version===epoch)await wake(new Date(now()+60000).toISOString());return;}
   if(version!==epoch)return;const next=await post('next',{});if(version!==epoch)return;s={...s,checksRemaining:s.checksRemaining-1};
   if(['waiting','idle'].includes(next.phase)){s={...s,nextDueAt:next.nextDueAt??null,message:waitingMessage(next.reason,next.nextDueAt)};await save(s);if(version===epoch)await wake(s.nextDueAt);return;}
   if(next.phase!=='navigate'||!['like','comment','reply'].includes(next.kind)||next.actorId!==s.blogId||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(next.jobId??''))throw Error('웹의 승인 대상을 확인하지 못했습니다.');
   const u=new URL(next.url),m=/^\/([a-z0-9_-]{1,50})\/(\d{1,30})$/.exec(u.pathname);if(u.protocol!=='https:'||u.hostname!=='blog.naver.com'||u.port||u.username||u.password||u.search||u.hash||!m||(next.kind==='reply'?m[1]!==s.blogId:m[1]===s.blogId))throw Error('승인된 대상 글 주소가 아닙니다.');
   // 서버에 묻는 사이 탭이 가려졌으면 이동하지 않고 다음에 다시 묻는다(작업은 검토 완료로 남음).
   if(!await front(s)){s={...s,message:HOLD};await save(s);if(version===epoch)await wake(new Date(now()+60000).toISOString());return;}
   s={...s,url:next.url,expectedNavigation:next.url,navigating:true,message:`대상 이동 중 · ${m[1]}/${m[2]}`};await save(s);if(version!==epoch)return;
   await browser.tabs.update(s.tabId,{url:next.url,active:true});let complete=false;
   // 불러오는 동안 다른 탭을 봐도 멈추지 않는다 — 누르는 단계(work-bridge)가 탭이 보일 때만 진행한다.
   for(let i=0;i<60;i++){if(version!==epoch)return;const tab=await check(s);if(tab.status==='complete'&&tab.url===next.url){complete=true;break;}await sleep(500);}
   if(!complete)throw Error('대상 글을 정해진 시간 안에 확인하지 못했습니다.');if(version!==epoch)return;
   s={...s,expectedNavigation:null,navigating:false,inFlight:true,message:'진행 중 · 현재 계정·글·승인 작업 재확인'};await save(s);if(version!==epoch)return;
   const result=await work.start({scheduled:true,traversal:true,jobId:next.jobId,tabId:s.tabId});if(version!==epoch)return;
   if(result.phase==='idle'&&['not_due','scheduled','outside_window','paused'].includes(result.reason)){s={...s,inFlight:false,nextDueAt:result.nextDueAt??null,message:waitingMessage(result.reason,result.nextDueAt)};}
   else if(result.phase==='done'&&result.resultState==='succeeded'){s={...s,inFlight:false,remaining:s.remaining-1,nextDueAt:result.nextDueAt??null,message:'완료 · 결과 저장 후 다음 승인 글 대기'};}
   // 대상 탭이 오래 가려져 누르지 않고 미룬 경우: 실행이 없었으므로 순회는 켠 채 다음 주기에 다시 확인한다.
   else if(result.phase==='deferred'){s={...s,inFlight:false,nextDueAt:null,message:'미룸 · 대상 탭이 오래 가려져 누르지 않았습니다. 다음 주기에 다시 확인합니다.'};}
   else throw Error('대상이 바뀌었거나 실행 결과를 확인하지 못했습니다.');
   await save(s);if(version!==epoch)return;await wake(s.nextDueAt);if(version!==epoch)await browser.alarms.clear(TRAVERSAL_ALARM);
  }catch(e){if(s)await save({...s,enabled:false,message:`순회 중단 · ${e?.message??'결과 미확인'} 자동으로 재시도하지 않습니다.`});await browser.alarms.clear(TRAVERSAL_ALARM);}
  finally{busy=false;}
 }
 const invalidate=async predicate=>{const version=epoch,s=await read();if(version===epoch&&s?.enabled&&predicate(s))await stop();};
 // v1.18 C-2 (1): 같은 창에서 다른 탭을 눌러도 순회를 끄지 않는다(잠시 멈춤). 순회 탭에서 다른 주소로 옮기거나 탭을 닫으면 멈춘다.
 browser.tabs.onUpdated?.addListener((id,v)=>{if(v.url)void invalidate(s=>id===s.tabId&&v.url!==s.url&&v.url!==s.expectedNavigation).catch(()=>{});});
 browser.tabs.onRemoved?.addListener(id=>{void invalidate(s=>id===s.tabId).catch(()=>{});});
 return {start,stop,status,alarm};
}
