importScripts('editor.js','article-plan.js','writer.js');
const API = 'https://naver-blog-agent.vercel.app';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let busy = false;
let refreshSession = false;
const stored = () => chrome.storage.local.get(['connection','deviceId','session','editorTab','completedEditorTab','activeTask','pendingResult','connectionError','update']);
async function web(path, body, token) {
  const response = await fetch(API + path, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}) }, body:JSON.stringify(body || {}), signal:AbortSignal.timeout(15000) });
  const data = await response.json().catch(()=>({})); if (!response.ok) throw new Error(data.error || '웹 서버 연결 오류 ('+response.status+')'); return data;
}
// 확장 내부 흐름은 그대로 두고, 호출만 AIMaster 웹 API(/api/extension/*)로 연결하는 어댑터
async function api(route, body = {}, override) {
  const c = override || (await stored()).connection;
  switch (route) {
    case '/pair': { const d = await web('/api/extension/auth', {code:body.code, deviceName:'Chrome'}); return {token:d.token, label:'네이버 블로그', blogId:body.blogId, platform:'naver'}; }
    case '/poll': return web('/api/extension/task', {blogId:c.blogId}, c.token);
    case '/result': return web('/api/extension/finish', {taskId:body.id, success:Boolean(body.result?.published), postUrl:body.result?.url || null, error:body.error ? `[${body.code || 'ERROR'}] ${body.error}` : null}, c.token);
    case '/task/status': return web('/api/extension/status', {id:body.id}, c.token);
    case '/heartbeat': return {};
    case '/status': return web('/api/extension/status', {}, c.token);
    case '/disconnect': return web('/api/extension/status', {disconnect:true}, c.token);
    case '/progress': case '/stage': case '/waiting': return {};
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
  const results = await chrome.scripting.executeScript({target:{tabId,allFrames:true},func:editorCommand,args:[command,args]});
  return results.map(item=>({...item.result,frameId:item.frameId,...(!item.result?{status:'unknown',reason:'확장 페이지 응답 없음 · frame '+item.frameId}:{} )}));
}
async function inspect(tabId) {
  const {connection} = await stored(); const tab = await chrome.tabs.get(tabId); const url = new URL(tab.url);
  if (url.hostname === 'blog.naver.com' && !(url.pathname === `/${connection.blogId}/postwrite` || url.searchParams.get('blogId') === connection.blogId)) return {status:'unknown',reason:'대상 블로그 글쓰기 화면으로 이동해 주세요.'};
  const results = await frameResults(tabId,'inspect',{blogId:connection.blogId});
  return results.find(r=>['security_check','expired','account_mismatch'].includes(r.status)) || results.find(r=>r.status==='valid') || results.find(r=>r.diagnostics?.componentCount) || results[0];
}
async function editorTab(interactive = false,task) {
  const current=await stored();
  const blogId=task?.blogId || current.connection.blogId;
  const host='blog.naver.com';
  const url=`https://${host}/${encodeURIComponent(blogId)}/postwrite`;
  const kind=tab=>{
    let u;try{u=new URL(tab.url || 'about:blank');}catch{return '';}
    if(u.hostname==='nid.naver.com')return 'login';
    if(u.hostname!==host)return '';
    const own=u.pathname.split('/')[1]===blogId || u.searchParams.get('blogId')===blogId;
    if(!own)return '';
    if(u.pathname===`/${blogId}/postwrite` || /\/PostWriteForm\.naver$/i.test(u.pathname))return 'editor';
    if(u.pathname===`/${blogId}` || new RegExp('^/'+blogId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/\\d+/?$').test(u.pathname) || /^\/(PostView|PostList)\.naver$/i.test(u.pathname))return 'read';
    return '';
  };
  let tab=current.editorTab?await chrome.tabs.get(current.editorTab).catch(()=>null):null;
  if(tab && !kind(tab))tab=null;
  if(!tab){
    const tabs=await chrome.tabs.query({url:`https://${host}/*`});
    tab=tabs.find(t=>kind(t)==='editor') || tabs.find(t=>kind(t)==='read');
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
      tab=await chrome.tabs.update(tab.id,{url,active:interactive});
      await chrome.storage.local.remove('completedEditorTab');
    }else if(interactive)await chrome.tabs.update(tab.id,{active:true});
    if(interactive)await chrome.windows.update(tab.windowId,{focused:true});
  }
  await chrome.storage.local.set({editorTab:tab.id}); return tab.id;
}
async function inspectSession(tabId) {
  let result;
  for (let n=0;n<6;n++) {result=await inspect(tabId).catch(error=>({status:'unknown',reason:`편집기 확인 실패: ${error.message}`})); if(result.status!=='unknown')break; await sleep(500);}
  const diagnostic=await chrome.storage.local.get('titleProbeBuild');
  if(result?.status==='valid' && diagnostic.titleProbeBuild!=='20260927.7' && !(await stored()).activeTask){
    const probe=(await chrome.scripting.executeScript({target:{tabId,frameIds:[result.frameId]},func:editorCommand,args:['probeTitle',{}]}).catch(()=>[]))[0]?.result;
    if(probe?.ok){result.reason=probe.reason;await chrome.storage.local.set({titleProbeBuild:'20260927.7'});}
  }
  const session={...result,checkedAt:new Date().toISOString()}; await chrome.storage.local.set({session});return session;
}
async function command(tabId,command,args={}) {
  const editor=await inspect(tabId);
  if(editor.status!=='valid')throw new Error(editor.reason || '글쓰기 계정을 확인할 수 없습니다.');
  const injected=await chrome.scripting.executeScript({target:{tabId,frameIds:[editor.frameId]},func:editorCommand,args:[command,args]});
  const results=injected.map(r=>r.result || {error:command+': 확장 페이지 응답 없음 · frame '+r.frameId+' · '+(r.error?.message || '주입 도중 예외 또는 페이지 이동')}); const success=results.find(r=>r.ok);
  if(!success)throw new Error(results.find(r=>r.error)?.error || `${command}: 편집기 반영을 확인하지 못했습니다.`); return success;
}
async function finish(result) {
  if(result.result?.published===true){
    const state=await stored();
    const tab=state.activeTask?.tabId?await chrome.tabs.get(state.activeTask.tabId).catch(()=>null):null;
    if(tab){
      const snapshot=await command(tab.id,'snapshot',{blogId:state.activeTask.blogId}).catch(()=>null);
      await chrome.storage.local.set({completedEditorTab:{id:tab.id,url:tab.url,snapshot}});
    }
  }
  await chrome.storage.local.set({pendingResult:result}); await api('/result',result);
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
      const results=await frameResults(tab.id,'reserved',args).catch(()=>[]);
      const done=results.find(r=>r.complete);
      if(done){const {complete,frameId,...result}=done;return {...result,published:true};}
      reason=results.find(r=>r.reason)?.reason || reason;
    }
    throw Object.assign(new Error(reason+' 자동으로 재발행하지 않습니다.'),{code:'PUBLISH_UNCERTAIN'});
  }finally{await chrome.tabs.remove(tab.id).catch(()=>{});}
}
// Authoring and final publication are separate so a real editor can be verified without publishing.
async function writeArticle(task,options={}) {
  const tabId=task.tabId, p=task.payload;
  const {steps,plan,imageCount}=buildWriterSteps(p,articlePlan(p.article));
  await runWriter({steps,requireEmpty:true,
    read:()=>command(tabId,'snapshot'),
    apply:async(block,anchor)=>{
      if(block.type==='image'){
        return command(tabId,'image',{...await loadAsset(task,block.index),name:block.name,...anchor});
      }
      return command(tabId,block.type,{...block,...anchor,breakSentences:p.breakSentencesInBody});
    },
    save:options.save || (checkpoint=>chrome.storage.local.set({authoringCheckpoint:{...checkpoint,blogId:task.blogId,title:p.title,taskId:task.id}})),
    onProgress:options.onProgress || ((done,total,type)=>type==='paragraph' && done!==total ? undefined : api('/progress',{id:task.id,message:`네이버 ${done}/${total} · ${type==='image'?'이미지':type==='quote'?'제목·섹션':'본문'} 입력 확인 완료`})),
    checkCancelled:options.checkCancelled || (async()=>{if((await api('/task/status',{id:task.id})).state!=='running')throw new Error('작업이 취소되었습니다. 입력한 내용은 보존됩니다.');})
  });
  await command(tabId,'imageAi');
  await command(tabId,'verify',{title:p.title,article:p.article,plan,titleQuote:true,requireAi:true,sectionStyle:'quotation_line',imageCount});
  return {complete:true,imageCount,steps:steps.length};
}
async function publish(task) {
  const tabId=task.tabId,p=task.payload;
  await writeArticle(task);
  await command(tabId,'click',{selector:'button[data-click-area="tpb.publish"], button[class*="publish_btn__"]',skipIfSelector:'button[data-testid="seOnePublishBtn"]'}); await sleep(400);
  await command(tabId,'settings',p);
  if((await inspect(tabId)).status!=='valid')throw new Error('로그인 상태가 변경되었습니다. 작성된 글을 확인하세요.');
  await api('/stage',{id:task.id,stage:'final_publish'});
  await chrome.storage.local.set({activeTask:{...task,stage:'final_publish'}});
  await command(tabId,'click',{selector:'button[data-testid="seOnePublishBtn"], button[data-click-area="tpb*i.publish"]'});
  if(p.publishScheduleMode==='reserve')return verifyReservation(task);
  let refreshed=false;
  for(let n=0;n<45;n++){
    await sleep(1000);
    const results=await frameResults(tabId,'published',{blogId:task.blogId,title:p.title}).catch(()=>[]);
    const done=results.find(r=>r.complete);if(done)return {published:true,url:done.url};
    const stale=results.find(r=>r.refreshUrl);
    if(stale && !refreshed){refreshed=true;await chrome.tabs.update(tabId,{url:stale.refreshUrl});}
  }
  throw Object.assign(new Error('발행 결과가 불확실합니다. 예약 목록 또는 게시글을 확인하세요. 자동 재발행하지 않습니다.'),{code:'PUBLISH_UNCERTAIN'});
}
async function prepareFreshNaver(task) {
  if(!task.editorResetStarted){
    task.tabId=await editorTab(Boolean(task.payload.interactive || task.type==='publish'),{...task,freshEditor:true});
    task.editorResetStarted=true;
    await chrome.storage.local.remove(['authoringCheckpoint','completedEditorTab']);
    await chrome.storage.local.set({activeTask:{...task,stage:'waiting_login'}});
    await api('/progress',{id:task.id,message:'글쓰기 화면을 새로 열어 처음부터 입력할 준비를 합니다. 저장된 본문과 이미지를 재사용합니다.'});
    await sleep(700);
  }
  let stableSince=0;
  for(let n=0;n<40;n++){
    if((await api('/task/status',{id:task.id})).state!=='running')throw new Error('작업이 취소되었습니다.');
    const tab=await chrome.tabs.get(task.tabId);
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
  const state=await api('/task/status',{id:task.id});if(state.state!=='running'){await chrome.storage.local.remove('activeTask');return;}
  const fresh=task.type==='publish';
  let session;
  try{session=fresh?await prepareFreshNaver(task):await inspectSession(task.tabId);}
  catch(error){return finish({id:task.id,error:error.message,code:'EDITOR_PREPARATION_FAILED'});}
  if(session.status!=='valid') {
    if(['unknown','account_mismatch'].includes(session.status) && !task.payload.interactive) return finish({id:task.id,result:session});
    const tab=await chrome.tabs.get(task.tabId).catch(()=>null);
    if(!tab){task.tabId=await editorTab(true,task);}
    else if(tab.url && new URL(tab.url).hostname==='www.naver.com'){
      await chrome.tabs.update(task.tabId,{url:`https://blog.naver.com/${task.blogId}/postwrite`});
    }
    await api('/waiting',{id:task.id,reason:session.reason,status:session.status});
    await chrome.storage.local.set({activeTask:{...task,stage:'waiting_login'}});return;
  }
  await api('/stage',{id:task.id,stage:'writing'});await chrome.storage.local.set({activeTask:{...task,stage:'writing'}});
  try {await finish({id:task.id,result:await publish(task)});}catch(error){
    const current=(await stored()).activeTask; await finish({id:task.id,error:error.message,code:current?.stage==='final_publish'?'PUBLISH_UNCERTAIN':error.code || 'AUTHORING_FAILED'});
  }
}
async function pump() {
  if(busy)return;busy=true;let heartbeat;
  try {
    let state=await stored(); if(!state.connection)return;
    await api('/heartbeat'); heartbeat=setInterval(()=>api('/heartbeat').catch(()=>{}),20000);
    if(state.pendingResult){await api('/result',state.pendingResult);await chrome.storage.local.remove(['pendingResult','activeTask']);state=await stored();}
    if(state.activeTask){
      if(['waiting_login','writing'].includes(state.activeTask.stage)){
        const task=state.activeTask;
        if(task.stage==='writing')task.editorResetStarted=false;
        await resume(task);
      }
      else if(state.activeTask.payload.publishScheduleMode==='reserve'){
        try{await finish({id:state.activeTask.id,result:await verifyReservation(state.activeTask)});}
        catch(error){await finish({id:state.activeTask.id,error:error.message,code:'PUBLISH_UNCERTAIN'});}
      }
      else await finish({id:state.activeTask.id,error:'작성 중 확장이 재시작되었습니다. 열린 글을 확인하세요. 자동으로 재발행하지 않습니다.',code:'PUBLISH_UNCERTAIN'});
      return;
    }
    const {task}=await api('/poll',{session:state.session});
    if(task){
      if(task.type==='verifyPublish'){
        await chrome.storage.local.set({activeTask:{...task,stage:'verify_publish'}});
        try{await finish({id:task.id,result:await verifyReservation(task)});}
        catch(error){await finish({id:task.id,error:error.message,code:'PUBLISH_UNCERTAIN'});}
        return;
      }
      if(task.type!=='publish'){
        await finish({id:task.id,error:'지원하지 않는 확장 작업입니다. 확장을 업데이트하세요.',code:'UNSUPPORTED_TASK'});return;
      }
      const tabId=undefined;
      const active={...task,tabId,stage:'waiting_login'};await chrome.storage.local.set({activeTask:active});await resume(active);
    }else if(state.editorTab && (refreshSession || !state.session || Date.now()-Date.parse(state.session.checkedAt)>60000)) {
      refreshSession=false;
      const session=await inspectSession(state.editorTab);await api('/status',{session});
    }
    await chrome.storage.local.remove('connectionError');
  }catch(error){await chrome.storage.local.set({connectionError:error.message});}finally{clearInterval(heartbeat);busy=false;}
}
chrome.alarms.create('connection',{periodInMinutes:.5});chrome.alarms.onAlarm.addListener(()=>pump());
chrome.alarms.create('update-check',{periodInMinutes:360});chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='update-check')checkUpdate();});
chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('connect.html')}));
chrome.tabs.onUpdated.addListener(async(id,change)=>{
  if(change.status!=='complete')return;
  const state=await stored();
  if(id===state.editorTab)refreshSession=true;
  // Also receive queued requests promptly when the user's blog first opens.
  if(id===state.editorTab || /^https:\/\/(blog|nid)\.naver\.com\//.test(change.url || (await chrome.tabs.get(id).catch(()=>null))?.url || ''))pump();
});
chrome.runtime.onStartup.addListener(()=>{pump();checkUpdate();});
chrome.runtime.onInstalled.addListener(()=>{pump();checkUpdate();});
// Poll the AIMaster web queue every 10s while awake; alarms remain the worker-suspension fallback.
// Idle editor inspection is still limited to once per minute or a page load.
setInterval(()=>pump(),10000);
pump();
checkUpdate();
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{
  (async()=>{
    if(message.type==='status'){pump();return stored();}
    if(message.type==='checkUpdate'){await checkUpdate();return {update:(await stored()).update || null};}
    if(message.type==='pair'){
      const state=await stored();if(state.activeTask)throw new Error('진행 중인 작업을 먼저 취소하세요.');
      const blogId=String(message.blogId||'').trim();if(!/^[A-Za-z0-9_-]{2,40}$/.test(blogId))throw new Error('네이버 블로그 ID를 영문·숫자 2~40자로 입력하세요.');
      const deviceId=state.deviceId || crypto.randomUUID();const connection=await api('/pair',{code:message.code,deviceId,blogId});
      await chrome.storage.local.set({deviceId,connection});await chrome.storage.local.remove(['session','editorTab']);return {ok:true};
    }
    if(message.type==='session'){if(!(await stored()).connection)throw new Error('먼저 연결 코드를 입력하세요.');const tabId=await editorTab(true);await inspectSession(tabId);pump();return {ok:true};}
    if(message.type==='disconnect'){if((await stored()).activeTask)throw new Error('앱에서 대기를 먼저 취소하세요.');await api('/disconnect');await chrome.storage.local.remove(['connection','session','editorTab']);return {ok:true};}
    throw new Error('지원하지 않는 요청');
  })().then(reply,error=>reply({error:error.message}));return true;
});
