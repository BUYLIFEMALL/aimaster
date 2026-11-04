import {operateVisibleNaverWork} from './work-dom.mjs';
const jobIdOf=r=>r.job?.id;
export function createWorkBridge(browser,identity,post,now=Date.now,popupFocused=async()=>false,readingClock={now:()=>performance.now(),sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 let busy=false,epoch=0,active=null,last='연결 전 · 웹에서 확장 실행 허용 필요';
 const emit=message=>{last=message;try{void Promise.resolve(browser.runtime?.sendMessage?.({type:'work_progress',message,deviceId:active?.deviceId})).catch(()=>{});}catch{}};
 const state=()=>({connected:busy&&!!active,message:last});
 // v1.17 단계 C-1(주인님 결정 가안): 「창이 선택돼 있는가」 대신 「대상 탭이 화면에 보이는가」로 판단한다.
 // 다른 프로그램을 써도 대상 탭이 보이면 이어가고, 가려지면 정독 시계만 멈춘다. 누르는 단계는 보일 때만.
 const PAUSE_LIMIT=600000;
 async function visible(target){
  try{const r=await browser.scripting.executeScript({target:{tabId:target.id},world:'ISOLATED',func:()=>document.visibilityState,args:[{operation:'visibility'}]});return r?.[0]?.result==='visible';}catch{return false;}
 }
 async function current(binding,target,version){
  const who=await identity();if(version!==epoch||who.deviceId!==binding.deviceId||who.blogId!==binding.blogId)throw Error('연결 계정이 바뀌거나 실행을 중단했습니다.');
  // v1.18 C-2 (1): 같은 창에서 다른 탭을 본 것은 「가림」과 같다(시계만 멈춤). 대상 탭의 주소가 바뀌거나 탭이 사라지면 중단.
  const tab=await browser.tabs.get(target.id);if(tab.windowId!==target.windowId||tab.url!==target.url)throw Error('현재 탭이 바뀌었습니다.');
  const tabs=await browser.tabs.query({active:true,windowId:target.windowId});
  const w=await browser.windows.get(target.windowId);if(tabs.length!==1||tabs[0].id!==target.id||w.state==='minimized'||!await visible(target)){const hidden=Error('대상 탭이 화면에 보이지 않습니다. 브라우저 창을 최소화하지 말고 대상 탭이 보이게 두세요.');hidden.hidden=true;throw hidden;}
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
  return {...state(),phase:result.phase,resultState:result.state};
 }
 async function start(options={}){
  if(busy)throw Error('이미 현재 탭 작업을 처리하고 있습니다.');busy=true;const version=epoch;let detach=()=>{};
  try{
   const binding=await identity();
   // v1.18 C-2: 순회는 자기 탭을 대상으로 넘긴다(그사이 회원이 다른 탭을 봐도 그 탭을 대상으로 잡지 않음).
   const tabs=Number.isInteger(options.tabId)?[await browser.tabs.get(options.tabId)]:await browser.tabs.query({active:true,currentWindow:true});
   if(tabs.length!==1||!Number.isInteger(tabs[0].id))throw Error('네이버 글 또는 준비된 신청 화면을 열어 주세요.');const target={id:tabs[0].id,windowId:tabs[0].windowId,url:tabs[0].url};
   const changedUrl=(id,change)=>{if(id===target.id&&change.url&&change.url!==target.url)epoch++;};
   browser.tabs.onUpdated?.addListener(changedUrl);
   detach=()=>{browser.tabs.onUpdated?.removeListener(changedUrl);};
   // 순회 대상 탭이 가려져 있으면 서버에 실행을 요청하기 전에 보일 때까지 기다린다(10분 넘으면 아무것도 하지 않고 미룸).
   for(let waited=0;;){
    try{await current(binding,target,version);break;}
    catch(e){if(e?.hidden!==true||options.traversal!==true)throw e;const t0=readingClock.now();await readingClock.sleep(1000);waited+=readingClock.now()-t0;
     if(waited>PAUSE_LIMIT){last='다음 주기로 미룸 · 대상 탭이 10분 넘게 보이지 않아 시작하지 않았습니다.';return {...state(),phase:'deferred'};}
     emit('잠시 멈춤 · 대상 글 탭이 보이면 시작합니다.');}
   }
   let r=await post(options.traversal===true?'traversal_offer':options.scheduled===true?'scheduled_offer':'offer',{request_id:crypto.randomUUID(),url:target.url});
   if(r.phase==='idle'){last=options.scheduled===true?`반복 대기 · ${r.reason??'현재 화면의 승인 작업 없음'}${r.nextDueAt?` · 다음 확인 ${r.nextDueAt}`:''}`:'현재 화면에 검토 완료된 실행 대상이 없습니다.';return {...state(),phase:'idle',reason:r.reason,nextDueAt:r.nextDueAt};}
   if(r.phase!=='inspect'||!r.job||typeof r.nonce!=='string'||!r.profile||r.job.actor_id!==binding.blogId)throw Error('실행 준비 결과를 확인하지 못했습니다.');
   active={id:r.id,deviceId:binding.deviceId};await browser.storage.session.set({workRun:active});if(options.jobId&&jobIdOf(r)!==options.jobId)throw Error('예정된 작업이 변경됐습니다.');
   emit('진행 중 · 웹에서 승인된 작업을 받아 현재 계정·대상을 확인합니다.');
   const job=r.job,profile=r.profile;let frame,expectedArticle;
   const script=async(operation,permit)=>{
    await current(binding,target,version);
    const results=await browser.scripting.executeScript({target:operation==='inspect'?{tabId:target.id,allFrames:true}:{tabId:target.id,frameIds:[frame]},world:'ISOLATED',func:operateVisibleNaverWork,args:[{operation,job,profile,permit,expectedArticle}]});
    await current(binding,target,version);
    if(operation==='inspect'){
     const matches=results.filter(x=>x.result?.accountId===job.account_id&&x.result?.actorId===job.actor_id&&x.result?.neighborId===job.neighbor_id&&x.result?.postId===job.post_id);
     if(matches.length!==1||!Number.isInteger(matches[0].frameId)){
      // Most specific cause wins: a frame that reached the post (comment list/article/account) outranks frames that are simply other pages.
      const reasons=new Set(results.map(x=>x.result?.reason).filter(Boolean));
      throw Error(reasons.has('commentList')?'대상 글의 댓글 목록을 확인하지 못했습니다. 글 아래 댓글 칸을 열어 둔 뒤 다시 실행해 주세요.':
       reasons.has('article')?'대상 글 본문 전체를 확인하지 못했습니다. 글이 끝까지 열린 상태에서 다시 실행해 주세요.':
       reasons.has('account')?'지금 로그인한 네이버 계정이 작업 계정과 다릅니다.':
       reasons.has('target')?'지금 탭이 작업 대상 글이 아닙니다. 웹에서 연 대상 글 탭에서 실행해 주세요.':'현재 작업 화면을 하나로 확인하지 못했습니다.');
     }frame=matches[0].frameId;return matches[0].result;
    }
    if(results.length!==1||results[0].frameId!==frame||results[0].error)throw Error('화면 결과 미확인');return results[0].result;
   };
   let v=await script('inspect');if(job.kind!=='request'){
    if(typeof v.articleHash!=='string'||!(/^[a-f0-9]{64}$/.test(v.articleHash))||!Number.isSafeInteger(v.articleCharacters)||v.articleCharacters<1||v.articleCharacters>100000)throw Error('본문 전체를 확인하지 못했습니다.');
    expectedArticle={articleHash:v.articleHash,articleCharacters:v.articleCharacters};
   }emit('진행 중 · 계정·대상 확인 후 실행 한도를 확인합니다.');
   r=await post('inspect',{id:active.id,nonce:r.nonce,observation:v});
   if(job.kind!=='request'){
    const duration=r.readDurationMs;
    if(r.phase!=='reading'||typeof r.nonce!=='string'||!Number.isSafeInteger(duration)||duration!==Math.max(30000,Math.ceil(expectedArticle.articleCharacters/500)*5000))throw Error('정독 대기 조건을 확인하지 못했습니다.');
    // 정독 시간은 대상 탭이 보이는 동안만 센다. 가려진 동안은 시계만 멈추고(실패 아님), 10분 넘게 가려지면
    // 누르지 않고 이 작업을 다음 주기로 미룬다(작업은 「검토 완료」 그대로, 자동으로 다시 누르지 않음).
    const started=readingClock.now();let lastElapsed=0,paused=0,deferred=false;
    while(lastElapsed<duration){
     emit(`정독 대기 중 · ${Math.ceil((duration-lastElapsed)/1000)}초 남음 · 대상 탭이 화면에 보이게 두세요(다른 프로그램은 써도 됩니다).`);
     const t0=readingClock.now();
     await readingClock.sleep(Math.min(1000,duration-lastElapsed));
     try{await current(binding,target,version);v=await script('inspect');}
     catch(e){
      if(e?.hidden!==true)throw e;
      paused+=readingClock.now()-t0;if(paused>PAUSE_LIMIT){deferred=true;break;}
      emit(`잠시 멈춤 · 대상 탭이 보이면 정독을 이어갑니다(${Math.ceil((PAUSE_LIMIT-paused)/60000)}분 안에 돌아오지 않으면 다음 주기로 미룹니다).`);continue;
     }
     if(v.articleHash!==expectedArticle.articleHash||v.articleCharacters!==expectedArticle.articleCharacters||v.restriction!=='none')throw Error('정독 중 본문·계정·화면이 변경됐습니다.');
     lastElapsed+=readingClock.now()-t0;const wall=readingClock.now()-started;
     if(!Number.isFinite(wall)||!Number.isFinite(lastElapsed)||wall>duration+paused+30000)throw Error('정독 시간을 확인하지 못했습니다.');
    }
    if(deferred){
     await stop();last='다음 주기로 미룸 · 대상 탭이 10분 넘게 보이지 않아 누르지 않았습니다. 작업은 검토 완료 상태로 남아 다음 순회 때 다시 확인합니다.';
     return {...state(),phase:'deferred'};
    }
    r=await post('reading',{id:active.id,nonce:r.nonce,observation:v});
   }
   if(r.phase!=='recheck'||typeof r.nonce!=='string')throw Error('실행 준비 미확인');
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
   return {...state(),phase:'done',resultState:'succeeded',nextDueAt:result.nextDueAt};
  }catch(e){await stop();last=`${e?.message||'결과 미확인'} 자동으로 다시 등록하지 않습니다. 웹 작업 기록을 확인하세요.`;throw Error(last);}
  finally{detach();busy=false;}
 }
 return {start,stop,status};
}
