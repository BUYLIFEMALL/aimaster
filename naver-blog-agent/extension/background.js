importScripts('editor.js','article-plan.js','writer.js');
const API = 'https://naver-blog-agent.vercel.app';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let busy = false;
let refreshSession = false;
let runtimeQueue = Promise.resolve();
let runFault = null;
let pumpCycle=0;
async function runtimeRequest(body, connection) {
  const next=runtimeQueue.catch(()=>{}).then(()=>web('/api/extension/status',body,connection.token));
  runtimeQueue=next;
  return next;
}
async function taskRunning(task) {
  const result=await api('/task/status',{id:task.id,runId:task.runId});
  if(result.state!=='running' || (task.runId && result.runId!==task.runId))throw Object.assign(new Error('현재 실행이 종료되거나 변경되었습니다. 입력한 내용은 보존됩니다.'),{code:'RUN_STOPPED'});
  return result;
}
const stored = () => chrome.storage.local.get(['connection','deviceId','session','editorTab','completedEditorTab','preparedEditorTabs','lastPrepared','activeTask','pendingResult','connectionError','update','recovery','resultConflicts']);
const missingTab = error => /No tab with id:|Invalid tab ID/i.test(error?.message || '');
const closedTabError = () => Object.assign(new Error('네이버 글쓰기 탭이 닫혔거나 변경되었습니다. 원고는 보존됩니다. 글쓰기 화면을 확인한 뒤 다시 시작해 주세요.'), {code:'EDITOR_TAB_CLOSED',stop:true});
// Serialize reference updates so a delayed old-tab event cannot erase a new tab/session.
let tabStateQueue = Promise.resolve();
function updateTabState(operation) {
  const next = tabStateQueue.then(operation);
  tabStateQueue = next.catch(()=>{});
  return next;
}
function forgetTab(tabId) {
  return updateTabState(async()=>{
    const state = await stored(), keys = [];
    if(state.editorTab === tabId){
      keys.push('editorTab');
      refreshSession = false;
      await chrome.storage.local.set({session:{status:'unknown',reason:closedTabError().message,checkedAt:new Date().toISOString()}});
    }
    if(state.completedEditorTab?.id === tabId)keys.push('completedEditorTab');
    if(state.preparedEditorTabs?.some(tab=>tab.id===tabId))await chrome.storage.local.set({preparedEditorTabs:state.preparedEditorTabs.filter(tab=>tab.id!==tabId)});
    if(keys.length)await chrome.storage.local.remove(keys);
    // Keep activeTask, pendingResult and authoringCheckpoint for safe outcome reporting.
  });
}
async function getTab(tabId) {
  if(!Number.isInteger(tabId) || tabId < 0){if(tabId!=null)await forgetTab(tabId);return null;}
  try{return await chrome.tabs.get(tabId);}
  catch(error){if(!missingTab(error))throw error;await forgetTab(tabId);return null;}
}
async function requireTab(tabId) {
  const tab = await getTab(tabId);
  if(!tab)throw closedTabError();
  return tab;
}
async function inTab(tabId, operation) {
  await requireTab(tabId);
  try{return await operation();}
  catch(error){
    if(!missingTab(error))throw error;
    await forgetTab(tabId);
    throw closedTabError();
  }
}
async function recordBackgroundError(error) {
  try{await chrome.storage.local.set({connectionError:error?.message || '확장 상태 확인 중 오류가 발생했습니다.'});}
  catch{console.warn('확장 오류 상태를 저장하지 못했습니다. 확장을 새로고침해 주세요.');}
}
// Chrome event dispatch does not await async listeners. Every entry point owns its rejection.
function runBackground(operation) {
  return Promise.resolve().then(operation).catch(recordBackgroundError);
}
async function web(path, body, token) {
  const response = await fetch(API + path, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}) }, body:JSON.stringify(body || {}), signal:AbortSignal.timeout(15000) });
  const data = await response.json().catch(()=>({})); if (!response.ok) throw Object.assign(new Error(data.error || '웹 서버 연결 오류 ('+response.status+')'),{status:response.status,code:data.code}); return data;
}
// 확장 내부 흐름은 그대로 두고, 호출만 AIMaster 웹 API(/api/extension/*)로 연결하는 어댑터
async function api(route, body = {}, override) {
  const c = override || (await stored()).connection;
  switch (route) {
    case '/pair': { const d = await web('/api/extension/auth', {code:body.code, deviceName:'Chrome'}); return {token:d.token, label:'네이버 블로그', blogId:body.blogId, platform:'naver'}; }
    case '/poll': return web('/api/extension/task', {blogId:c.blogId,supportsPrepare:true,supportsRuns:true}, c.token);
    case '/result': {
      const success=Boolean(body.result?.published);
      const prepared=body.result?.prepared===true;
      await runtimeQueue.catch(()=>{});
      const receipt=await web('/api/extension/finish', {taskId:body.id, runId:body.runId, success, prepared, postUrl:body.result?.url || null, error:body.error ? `[${body.code || 'ERROR'}] ${body.error}` : null}, c.token);
      if(receipt.success!==true || receipt.persisted!==true || receipt.taskId!==body.id || receipt.status!==(prepared?'prepared':success?'published':'failed') || (body.runId && receipt.runId!==body.runId)){
        throw new Error('서버의 결과 저장 확인이 일치하지 않습니다. 결과는 보관되며 보고만 다시 시도합니다.');
      }
      return receipt;
    }
    case '/task/status': return runtimeRequest({id:body.id,runId:body.runId},c);
    case '/heartbeat': {
      const state=await stored(),task=state.activeTask;
      if(!task?.runId || state.pendingResult || task.stage==='prepared')return {};
      const receipt=await runtimeRequest({id:task.id,runId:task.runId,action:'heartbeat'},c);
      if(receipt.state!=='running' || receipt.runId!==task.runId)throw Object.assign(new Error('현재 실행 연결을 확인하지 못했습니다.'),{code:'RUN_STOPPED'});
      return receipt;
    }
    case '/status': return web('/api/extension/status', {}, c.token);
    case '/disconnect': return web('/api/extension/status', {disconnect:true}, c.token);
    case '/progress': case '/stage': case '/waiting': {
      if(!body.runId)return {}; // Existing local tasks retain the legacy protocol.
      const receipt=await runtimeRequest({...body,action:route.slice(1)},c);
      if(receipt.state!=='running' || receipt.runId!==body.runId)throw Object.assign(new Error('현재 실행 연결을 확인하지 못했습니다.'),{code:'RUN_STOPPED'});
      return receipt;
    }
    default: throw new Error('지원하지 않는 요청: '+route);
  }
}
// 새 버전 알림: 서버가 알려주는 최신 버전(/api/extension/version)과 이 확장의 version_name을 비교한다.
const installedVersion = () => chrome.runtime.getManifest().version_name || 'v' + chrome.runtime.getManifest().version;
const versionParts = v => { const m = /^v?(\d+)\.(\d+)/.exec(String(v || '')); return m ? [Number(m[1]), Number(m[2])] : null; };
function isNewer(latest, current) {
  const a = versionParts(latest), b = versionParts(current);
  return Boolean(a && b && (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])));
}
async function checkUpdate() {
  try {
    const response = await fetch(API + '/api/extension/version', {cache:'no-store', signal:AbortSignal.timeout(10000)});
    if (!response.ok) return;
    const data = await response.json();
    if (!versionParts(data.latest) || !String(data.downloadUrl || '').startsWith(API + '/')) return; // 우리 사이트 주소만 안내한다
    const current = installedVersion(), outdated = isNewer(data.latest, current);
    await chrome.storage.local.set({update:{latest:data.latest, current, downloadUrl:data.downloadUrl, outdated, checkedAt:Date.now()}});
    await chrome.action.setBadgeText({text: outdated ? 'NEW' : ''});
    if (outdated) await chrome.action.setBadgeBackgroundColor({color:'#e5484d'});
  } catch {}
}
async function loadAsset(task, index) {
  const asset = task.payload.assets?.[index];
  if (!asset || !/^https:\/\//i.test(asset.url)) throw new Error('이미지 주소가 올바르지 않습니다.');
  const response = await fetch(asset.url, {signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error('이미지를 가져오지 못했습니다. ('+response.status+')');
  const blob = await response.blob(); const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png';
  return {data:btoa(binary), name:asset.name || 'blog_img.png', mime};
}
async function frameResults(tabId, command, args = {}) {
  const results = await inTab(tabId,()=>chrome.scripting.executeScript({target:{tabId,allFrames:true},func:editorCommand,args:[command,args]}));
  return results.map(item=>({...item.result,frameId:item.frameId,...(!item.result?{status:'unknown',reason:'확장 페이지 응답 없음 · frame '+item.frameId}:{} )}));
}
async function inspect(tabId) {
  const {connection} = await stored(); const tab = await requireTab(tabId);
  if(!connection)return {status:'unknown',reason:'확장을 본인 계정으로 먼저 연결해 주세요.'};
  let url;try{url = new URL(tab.url);}catch{return {status:'unknown',reason:'글쓰기 화면이 로딩 중입니다.'};}
  if(url.protocol!=='https:' || !['blog.naver.com','nid.naver.com'].includes(url.hostname))return {status:'unknown',reason:'대상 블로그 글쓰기 화면으로 이동해 주세요.'};
  if (url.hostname === 'blog.naver.com' && !(url.pathname === `/${connection.blogId}/postwrite` || url.searchParams.get('blogId') === connection.blogId || (url.pathname === `/${connection.blogId}` && url.searchParams.get('Redirect')?.toLowerCase()==='write'))) return {status:'unknown',reason:'대상 블로그 글쓰기 화면으로 이동해 주세요.'};
  const results = await frameResults(tabId,'inspect',{blogId:connection.blogId});
  return results.find(r=>['security_check','expired','account_mismatch'].includes(r.status)) || results.find(r=>r.status==='valid') || results.find(r=>r.diagnostics?.componentCount) || results[0] || {status:'unknown',reason:'편집기 응답을 확인하지 못했습니다. 글쓰기 화면을 확인해 주세요.'};
}
async function editorTab(interactive = false,task) {
  const current=await stored();
  const protectedTab=id=>current.preparedEditorTabs?.some(tab=>tab.id===id);
  const blogId=task?.blogId || current.connection?.blogId;
  if(!blogId)throw new Error('확장을 본인 계정으로 먼저 연결해 주세요.');
  const host='blog.naver.com';
  const url=`https://${host}/${encodeURIComponent(blogId)}/postwrite`;
  const kind=tab=>{
    let u;try{u=new URL(tab.url || 'about:blank');}catch{return '';}
    if(u.hostname==='nid.naver.com')return 'login';
    if(u.hostname!==host)return '';
    const own=u.pathname.split('/')[1]===blogId || u.searchParams.get('blogId')===blogId;
    if(!own)return '';
    if(u.pathname===`/${blogId}/postwrite` || /\/PostWriteForm\.naver$/i.test(u.pathname) || (u.pathname===`/${blogId}` && u.searchParams.get('Redirect')?.toLowerCase()==='write'))return 'editor';
    if(u.pathname===`/${blogId}` || new RegExp('^/'+blogId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/\\d+/?$').test(u.pathname) || /^\/(PostView|PostList)\.naver$/i.test(u.pathname))return 'read';
    return '';
  };
  let tab=await getTab(current.editorTab);
  if(tab && (!kind(tab) || protectedTab(tab.id)))tab=null;
  if(!tab){
    const tabs=await chrome.tabs.query({url:`https://${host}/*`});
    tab=tabs.find(t=>!protectedTab(t.id) && kind(t)==='editor') || tabs.find(t=>!protectedTab(t.id) && kind(t)==='read');
  }
  if(!tab)tab=await chrome.tabs.create({url,active:interactive});
  else {
    // Only completed authoring or a read-only blog page can be navigated.
    // An unfinished editor stays intact for writer-prefix recovery.
    let completed=false;
    if(!task?.freshEditor && kind(tab)==='editor' && current.completedEditorTab?.id===tab.id && current.completedEditorTab?.url===tab.url && current.completedEditorTab.snapshot){
      const snapshot=await command(tab.id,'snapshot',{blogId}).catch(()=>null);
      completed=Boolean(snapshot && JSON.stringify(snapshot)===JSON.stringify(current.completedEditorTab.snapshot));
    }
    if(task?.freshEditor || kind(tab)==='read' || (kind(tab)==='editor' && completed)){
      tab=await inTab(tab.id,()=>chrome.tabs.update(tab.id,{url,active:interactive}));
      await chrome.storage.local.remove('completedEditorTab');
    }else if(interactive)await inTab(tab.id,()=>chrome.tabs.update(tab.id,{active:true}));
    if(interactive){
      await requireTab(tab.id);
      try{await chrome.windows.update(tab.windowId,{focused:true});}
      catch(error){if(!/No window with id:/i.test(error?.message || ''))throw error;throw closedTabError();}
    }
  }
  await updateTabState(async()=>{
    // A newly created tab may also close before storage is updated.
    try{await chrome.tabs.get(tab.id);}catch(error){if(missingTab(error))throw closedTabError();throw error;}
    await chrome.storage.local.set({editorTab:tab.id});
  });
  return tab.id;
}
async function inspectSession(tabId) {
  let result;
  for (let n=0;n<6;n++) {result=await inspect(tabId).catch(error=>({status:'unknown',reason:`편집기 확인 실패: ${error.message}`,closed:error.code==='EDITOR_TAB_CLOSED'})); if(result.closed || result.status!=='unknown')break; await sleep(500);}
  const diagnostic=await chrome.storage.local.get('titleProbeBuild');
  if(result?.status==='valid' && diagnostic.titleProbeBuild!=='20260927.7' && !(await stored()).activeTask){
    const probe=(await inTab(tabId,()=>chrome.scripting.executeScript({target:{tabId,frameIds:[result.frameId]},func:editorCommand,args:['probeTitle',{}]})).catch(()=>[]))[0]?.result;
    if(probe?.ok){result.reason=probe.reason;await chrome.storage.local.set({titleProbeBuild:'20260927.7'});}
  }
  const session={...result,checkedAt:new Date().toISOString()};
  await updateTabState(async()=>{if((await stored()).editorTab===tabId)await chrome.storage.local.set({session});});
  return session;
}
async function command(tabId,command,args={}) {
  if(runFault && !['snapshot','categories'].includes(command))throw runFault;
  const editor=await inspect(tabId);
  if(editor.status!=='valid')throw new Error(editor.reason || '글쓰기 계정을 확인할 수 없습니다.');
  const active=(await stored()).activeTask;
  if(active?.runId && active.tabId===tabId && !['snapshot','categories'].includes(command)){
    const permission=await taskRunning(active);
    if(!Number.isFinite(permission.leaseMs) || permission.leaseMs<=15000)throw Object.assign(new Error('실행 연결 확인이 만료에 가까워 입력을 멈췄습니다. 네이버 원고를 확인해 주세요.'),{code:'LEASE_EXPIRED'});
    args={...args,runId:active.runId,executionUntil:Date.now()+permission.leaseMs-15000};
  }
  const injected=await inTab(tabId,()=>chrome.scripting.executeScript({target:{tabId,frameIds:[editor.frameId]},func:editorCommand,args:[command,args]}));
  const results=injected.map(r=>r.result || {error:command+': 확장 페이지 응답 없음 · frame '+r.frameId+' · '+(r.error?.message || '주입 도중 예외 또는 페이지 이동')}); const success=results.find(r=>r.ok);
  if(!success)throw new Error(results.find(r=>r.error)?.error || `${command}: 편집기 반영을 확인하지 못했습니다.`); return success;
}
async function finish(result) {
  // Persist the actual outcome before optional tab diagnostics or a network retry.
  await chrome.storage.local.set({pendingResult:result});
  if(result.result?.prepared===true){
    await updateTabState(async()=>{
      const state=await stored(),task=state.activeTask;
      if(!task?.tabId)return;
      const tab=await chrome.tabs.get(task.tabId).catch(()=>null);if(!tab)return;
      const ready={id:tab.id,taskId:result.id,blogId:task.blogId,title:task.payload.title,preparedAt:Date.now()};
      await chrome.storage.local.set({lastPrepared:ready,preparedEditorTabs:[...(state.preparedEditorTabs || []).filter(item=>item.id!==tab.id),ready]});
    });
  }
  if(result.result?.published===true){
    try{
      const state=await stored();
      const tab=await getTab(state.activeTask?.tabId);
      if(tab){
        const snapshot=await command(tab.id,'snapshot',{blogId:state.activeTask.blogId}).catch(()=>null);
        await updateTabState(async()=>{
          try{await chrome.tabs.get(tab.id);}catch(error){if(missingTab(error))return;throw error;}
          await chrome.storage.local.set({completedEditorTab:{id:tab.id,url:tab.url,snapshot}});
        });
      }
    }catch{/* Optional diagnostics must never replace a confirmed publication outcome. */}
  }
  await api('/result',result);
  await chrome.storage.local.remove(['pendingResult','activeTask']);
}
async function verifyReservation(task) {
  if(task.payload.publishScheduleMode!=='reserve')throw new Error('예약 발행 확인 요청이 아닙니다.');
  const tab=await chrome.tabs.create({url:`https://blog.naver.com/${encodeURIComponent(task.blogId)}/postwrite`,active:false});
  let reason='예약 목록을 확인하지 못했습니다.';
  try {
    for(let n=0;n<30;n++){
      await sleep(500);
      const args={blogId:task.blogId,title:task.payload.title,scheduledAt:task.payload.scheduledAt,publishScheduleMode:'reserve',publishVisibility:task.payload.publishVisibility || 'private'};
      const results=await frameResults(tab.id,'reserved',args).catch(error=>{if(error.code==='EDITOR_TAB_CLOSED')throw error;return [];});
      const done=results.find(r=>r.complete);
      if(done){const {complete,frameId,...result}=done;return {...result,published:true};}
      reason=results.find(r=>r.reason)?.reason || reason;
    }
    throw Object.assign(new Error(reason+' 자동으로 재발행하지 않습니다.'),{code:'PUBLISH_UNCERTAIN'});
  }finally{await chrome.tabs.remove(tab.id).catch(()=>{});}
}
async function reportReservation(task) {
  let result;
  try{result={id:task.id,runId:task.runId,result:await verifyReservation(task)};}
  catch(error){result={id:task.id,runId:task.runId,error:error.message,code:'PUBLISH_UNCERTAIN'};}
  return finish(result);
}
// Authoring and final publication are separate so a real editor can be verified without publishing.
async function writeArticle(task,options={}) {
  const tabId=task.tabId, p=task.payload;
  const {steps,plan,imageCount}=buildWriterSteps(p,articlePlan(p.article));
  await runWriter({steps,requireEmpty:true,
    read:()=>command(tabId,'snapshot'),
    apply:async(block,anchor)=>{
      if(block.type==='image'){
        const asset=await loadAsset(task,block.index);
        if(task.runId)await taskRunning(task);
        return command(tabId,'image',{...asset,name:block.name,...anchor});
      }
      return command(tabId,block.type,{...block,...anchor,breakSentences:p.breakSentencesInBody});
    },
    save:options.save || (checkpoint=>chrome.storage.local.set({authoringCheckpoint:{...checkpoint,blogId:task.blogId,title:p.title,taskId:task.id,runId:task.runId}})),
    onProgress:options.onProgress || ((done,total,type)=>type==='paragraph' && done!==total ? undefined : api('/progress',{id:task.id,runId:task.runId,done,total,message:`네이버 ${done}/${total} · ${type==='image'?'이미지':type==='quote'?'제목·섹션':'본문'} 입력 확인 완료`})),
    checkCancelled:options.checkCancelled || (()=>taskRunning(task))
  });
  if(task.runId)await taskRunning(task);
  await command(tabId,'imageAi');
  await command(tabId,'verify',{title:p.title,article:p.article,plan,titleQuote:true,requireAi:true,sectionStyle:'quotation_line',imageCount});
  return {complete:true,imageCount,steps:steps.length};
}
async function publish(task) {
  const tabId=task.tabId,p=task.payload;
  if(p.executionMode!==undefined && !['prepare','publish'].includes(p.executionMode))throw new Error('진행 방식이 올바르지 않습니다. 원고는 보존됩니다.');
  await writeArticle(task);
  await command(tabId,'click',{selector:'button[data-click-area="tpb.publish"], button[class*="publish_btn__"]',skipIfSelector:'button[data-testid="seOnePublishBtn"]'}); await sleep(400);
  await command(tabId,'settings',p);
  if((await inspect(tabId)).status!=='valid')throw new Error('로그인 상태가 변경되었습니다. 작성된 글을 확인하세요.');
  if(task.type==='prepare' || p.executionMode==='prepare'){
    await taskRunning(task);
    await chrome.storage.local.set({activeTask:{...task,stage:'prepared'}});
    return {prepared:true,published:false};
  }
  await api('/stage',{id:task.id,runId:task.runId,stage:'final_publish'});
  await chrome.storage.local.set({activeTask:{...task,stage:'final_publish'}});
  await command(tabId,'click',{selector:'button[data-testid="seOnePublishBtn"], button[data-click-area="tpb*i.publish"]'});
  if(p.publishScheduleMode==='reserve')return verifyReservation(task);
  let refreshed=false;
  for(let n=0;n<45;n++){
    await sleep(1000);
    const results=await frameResults(tabId,'published',{blogId:task.blogId,title:p.title}).catch(error=>{if(error.code==='EDITOR_TAB_CLOSED')throw error;return [];});
    const done=results.find(r=>r.complete);if(done)return {published:true,url:done.url};
    const stale=results.find(r=>r.refreshUrl);
    if(stale && !refreshed){refreshed=true;await inTab(tabId,()=>chrome.tabs.update(tabId,{url:stale.refreshUrl}));}
  }
  throw Object.assign(new Error('발행 결과가 불확실합니다. 예약 목록 또는 게시글을 확인하세요. 자동 재발행하지 않습니다.'),{code:'PUBLISH_UNCERTAIN'});
}
async function prepareFreshNaver(task) {
  await taskRunning(task);
  if(!task.editorResetStarted){
    task.tabId=await editorTab(Boolean(task.payload.interactive || task.type==='publish'),{...task,freshEditor:true});
    task.editorResetStarted=true;
    await chrome.storage.local.remove(['authoringCheckpoint','completedEditorTab']);
    await chrome.storage.local.set({activeTask:{...task,stage:'waiting_login'}});
    await api('/progress',{id:task.id,runId:task.runId,message:'글쓰기 화면을 새로 열어 처음부터 입력할 준비를 합니다. 저장된 본문과 이미지를 재사용합니다.'});
    await sleep(700);
  }
  let stableSince=0;
  for(let n=0;n<40;n++){
    await taskRunning(task);
    const tab=await requireTab(task.tabId);
    if(tab.status==='loading'){stableSince=0;await sleep(500);continue;}
    try {
      const dialogs=await frameResults(task.tabId,'dismissResume');
      const blocked=dialogs.find(r=>r.error);if(blocked)throw Object.assign(new Error(blocked.error),{stop:true});
      if(dialogs.some(r=>r.dismissed)){stableSince=0;await sleep(500);continue;}
      const session=await inspect(task.tabId);
      if(['expired','security_check','account_mismatch'].includes(session.status))return {...session,checkedAt:new Date().toISOString()};
      if(session.status==='valid'){
        if(session.hasContent)throw Object.assign(new Error('새 글쓰기 화면에 이전 내용이 남아 있습니다. 임시글 이어쓰기를 취소한 뒤 다시 시작해 주세요.'),{stop:true});
        // The resume dialog may arrive after the first valid editor snapshot.
        // Continue observing the blank editor before accepting it for authoring.
        if(!stableSince)stableSince=Date.now();
        if(Date.now()-stableSince>=2000)return {...session,checkedAt:new Date().toISOString()};
      }else stableSince=0;
    }catch(error){stableSince=0;if(error.stop)throw error;}
    await sleep(500);
  }
  throw new Error('새 글쓰기 화면을 준비하지 못했습니다. Chrome의 로그인·알림을 확인한 뒤 작업 시작을 눌러 주세요.');
}
async function resume(task) {
  await taskRunning(task);
  const fresh=['publish','prepare'].includes(task.type);
  let session;
  try{session=fresh?await prepareFreshNaver(task):await inspectSession(task.tabId);}
  catch(error){return finish({id:task.id,runId:task.runId,error:error.message,code:error.code || 'EDITOR_PREPARATION_FAILED'});}
  if(session.status!=='valid') {
    if(['unknown','account_mismatch'].includes(session.status) && !task.payload.interactive) return finish({id:task.id,runId:task.runId,result:session});
    try{
      const tab=await requireTab(task.tabId);
      if(tab.url && new URL(tab.url).hostname==='www.naver.com'){
        await inTab(task.tabId,()=>chrome.tabs.update(task.tabId,{url:`https://blog.naver.com/${task.blogId}/postwrite`}));
      }
    }catch(error){if(error.code==='EDITOR_TAB_CLOSED')return finish({id:task.id,runId:task.runId,error:error.message,code:error.code});throw error;}
    await api('/waiting',{id:task.id,runId:task.runId,reason:session.reason,status:session.status});
    await chrome.storage.local.set({activeTask:{...task,stage:'waiting_login'}});return;
  }
  await api('/stage',{id:task.id,runId:task.runId,stage:'writing'});await chrome.storage.local.set({activeTask:{...task,stage:'writing'}});
  let result;
  try {result={id:task.id,runId:task.runId,result:await publish(task)};}catch(error){
    const current=(await stored()).activeTask;
    result={id:task.id,runId:task.runId,error:error.message,code:current?.stage==='final_publish'?'PUBLISH_UNCERTAIN':error.code || 'AUTHORING_FAILED'};
  }
  return finish(result);
}
async function pump() {
  if(busy)return;busy=true;const cycle=++pumpCycle;let heartbeat;
  try {
    let state=await stored(); if(!state.connection)return;
    runFault=null;
    heartbeat=setInterval(()=>api('/heartbeat').catch(error=>{if(busy && pumpCycle===cycle){runFault=error;runBackground(()=>recordBackgroundError(error));}}),45000);
    if(state.pendingResult){
      // Rebuild ready-tab protection before confirming a recovered prepare result.
      if(state.pendingResult.result?.prepared)await finish(state.pendingResult);
      else {await api('/result',state.pendingResult);await chrome.storage.local.remove(['pendingResult','activeTask']);}
      state=await stored();
    }
    if(state.activeTask){
      if(state.activeTask.stage==='waiting_login')await api('/heartbeat');
      if(state.activeTask.stage==='prepared'){
        await finish({id:state.activeTask.id,runId:state.activeTask.runId,result:{prepared:true,published:false}});
      }
      else if(state.activeTask.stage==='waiting_login'){
        await resume(state.activeTask);
      }
      else if(state.activeTask.stage==='writing'){
        await finish({id:state.activeTask.id,runId:state.activeTask.runId,error:'작성 중 확장이 재시작되었습니다. 원고와 입력 기록은 보존됩니다. 열린 글을 확인한 뒤 다시 시작해 주세요. 자동으로 재입력하거나 발행하지 않습니다.',code:'EDITOR_INTERRUPTED'});
      }
      else if(state.activeTask.payload.publishScheduleMode==='reserve'){
        await reportReservation(state.activeTask);
      }
      else await finish({id:state.activeTask.id,runId:state.activeTask.runId,error:'작성 중 확장이 재시작되었습니다. 열린 글을 확인하세요. 자동으로 재발행하지 않습니다.',code:'PUBLISH_UNCERTAIN'});
      return;
    }
    const {task,recovery}=await api('/poll',{session:state.session});
    if(recovery){
      await chrome.storage.local.set({recovery,connectionError:'이전 작업의 수신 확인이 없습니다. 네이버 글·예약 목록을 확인하고 보관함에서 복구해 주세요.'});
      return;
    }
    await chrome.storage.local.remove('recovery');
    if(task){
      if(task.type==='verifyPublish'){
        await chrome.storage.local.set({activeTask:{...task,stage:'verify_publish'}});
        await reportReservation(task);
        return;
      }
      if(!['publish','prepare'].includes(task.type)){
        await finish({id:task.id,runId:task.runId,error:'지원하지 않는 확장 작업입니다. 확장을 업데이트하세요.',code:'UNSUPPORTED_TASK'});return;
      }
      const tabId=undefined;
      const active={...task,tabId,stage:'waiting_login'};await chrome.storage.local.set({activeTask:active});await api('/stage',{id:task.id,runId:task.runId,stage:'waiting_login'});await resume(active);
    }else if(state.editorTab && (refreshSession || !state.session || Date.now()-Date.parse(state.session.checkedAt)>60000)) {
      refreshSession=false;
      const session=await inspectSession(state.editorTab);await api('/status',{session});
    }
    await chrome.storage.local.remove('connectionError');
  }catch(error){
    const state=await stored();
    if(['RUN_SUPERSEDED','RUN_STOPPED'].includes(error.code)){
      const outcome=state.pendingResult || (state.activeTask?{id:state.activeTask.id,runId:state.activeTask.runId,error:error.message}:null);
      if(outcome){
        // Retain superseded outcomes for inspection; never report them against a new run.
        const checkpoint=await chrome.storage.local.get('authoringCheckpoint');
        await chrome.storage.local.set({resultConflicts:[...(state.resultConflicts || []),{...outcome,title:state.activeTask?.payload?.title,checkpoint:checkpoint.authoringCheckpoint,recordedAt:Date.now()}]});
        if(state.pendingResult)await chrome.storage.local.remove('pendingResult');
        if(state.activeTask?.id===outcome.id && state.activeTask?.runId===outcome.runId)await chrome.storage.local.remove('activeTask');
      }
    }
    await chrome.storage.local.set({connectionError:error.message});
  }finally{clearInterval(heartbeat);runFault=null;busy=false;}
}
runBackground(()=>chrome.alarms.create('connection',{periodInMinutes:.5}));
runBackground(()=>chrome.alarms.create('update-check',{periodInMinutes:360}));
chrome.alarms.onAlarm.addListener(alarm=>runBackground(()=>alarm.name==='update-check'?checkUpdate():alarm.name==='connection'?pump():undefined));
chrome.action.onClicked.addListener(()=>runBackground(()=>chrome.tabs.create({url:chrome.runtime.getURL('connect.html')})));
chrome.tabs.onUpdated.addListener((id,change,tab)=>runBackground(async()=>{
  if(change.status!=='complete')return;
  const state=await stored();
  if(id===state.editorTab)refreshSession=true;
  // Also receive queued requests promptly when the user's blog first opens.
  if(id===state.editorTab || /^https:\/\/(blog|nid)\.naver\.com\//.test(change.url || tab?.url || ''))await pump();
}));
chrome.tabs.onRemoved.addListener(id=>runBackground(()=>forgetTab(id)));
chrome.tabs.onReplaced.addListener((_addedId,removedId)=>runBackground(()=>forgetTab(removedId)));
chrome.runtime.onStartup.addListener(()=>{runBackground(pump);runBackground(checkUpdate);});
chrome.runtime.onInstalled.addListener(()=>{runBackground(pump);runBackground(checkUpdate);});
// Poll the AIMaster web queue every 10s while awake; alarms remain the worker-suspension fallback.
// Idle editor inspection is still limited to once per minute or a page load.
setInterval(()=>runBackground(pump),10000);
runBackground(pump);
runBackground(checkUpdate);
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{
  (async()=>{
    if(message.type==='categories'){
      const state=await stored();
      if(!state.connection)throw new Error('확장을 본인 계정으로 먼저 연결해 주세요.');
      const auth=await api('/status',{},state.connection);
      if(auth.userId!==message.userId || !message.userId)throw new Error('프로그램 로그인 회원과 확장 연결 회원이 다릅니다. 본인 계정으로 다시 연결해 주세요.');
      if(state.connection.blogId!==message.blogId)throw new Error('확장에 연결된 블로그와 원고의 블로그가 다릅니다. 해당 블로그를 연결해 주세요.');
      const deadline=Date.now()+10000;
      while(true){
        if((await stored()).activeTask)throw new Error('확장 작업이 끝난 뒤 카테고리를 불러와 주세요.');
        if(!busy){busy=true;break;}
        if(Date.now()>=deadline)throw new Error('확장 상태 확인이 지연되고 있습니다. 잠시 후 다시 불러와 주세요.');
        await sleep(150);
      }
      try{
        const tabId=await editorTab(true);
        const result=await command(tabId,'categories');
        // Returning focus is optional: a closed requester must not turn a successful read into failure.
        if(_sender.tab?.id && _sender.url?.startsWith('https://naver-blog-agent.vercel.app/')){
          try{await chrome.tabs.update(_sender.tab.id,{active:true});}catch(error){if(!missingTab(error))throw error;}
        }
        return {blogId:state.connection.blogId,categories:result.categories};
      }finally{busy=false;}
    }
    if(message.type==='openPrepared'){
      const state=await stored(),ready=state.lastPrepared;
      if(!ready || ready.blogId!==state.connection?.blogId)throw new Error('이 연결에서 준비한 원고가 없습니다.');
      const tab=await requireTab(ready.id);
      if((await inspect(tab.id)).status!=='valid')throw new Error('준비된 글쓰기 화면을 확인해 주세요.');
      await inTab(tab.id,()=>chrome.tabs.update(tab.id,{active:true}));await chrome.windows.update(tab.windowId,{focused:true});return {ok:true};
    }
    if(message.type==='status'){runBackground(pump);return stored();}
    if(message.type==='checkUpdate'){await checkUpdate();return {update:(await stored()).update || null};}
    if(message.type==='pair'){
      const state=await stored();if(state.activeTask)throw new Error('진행 중인 작업을 먼저 취소하세요.');
      const blogId=String(message.blogId||'').trim();if(!/^[A-Za-z0-9_-]{2,40}$/.test(blogId))throw new Error('네이버 블로그 ID를 영문·숫자 2~40자로 입력하세요.');
      const deviceId=state.deviceId || crypto.randomUUID();const connection=await api('/pair',{code:message.code,deviceId,blogId});
      await chrome.storage.local.set({deviceId,connection});await chrome.storage.local.remove(['session','editorTab','lastPrepared']);return {ok:true};
    }
    if(message.type==='session'){if(!(await stored()).connection)throw new Error('먼저 연결 코드를 입력하세요.');const tabId=await editorTab(true);await inspectSession(tabId);runBackground(pump);return {ok:true};}
    if(message.type==='disconnect'){if((await stored()).activeTask)throw new Error('앱에서 대기를 먼저 취소하세요.');await api('/disconnect');await chrome.storage.local.remove(['connection','session','editorTab','lastPrepared']);return {ok:true};}
    throw new Error('지원하지 않는 요청');
  })().then(result=>{try{reply(result);}catch{}},error=>{try{reply({error:error.message});}catch{}});return true;
});
