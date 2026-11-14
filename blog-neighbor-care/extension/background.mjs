import { parsePost, inspectVisiblePost, chooseSnapshot } from './extractor.mjs';
import {createNeighborImporter} from './neighbor-importer.mjs';
import {parseNeighborPage} from './neighbor-extractor.mjs';
import {createWorkBridge} from './work-bridge.mjs';
import {createTargetTraversal} from './target-traversal.mjs';
import {createAcceptSchedule} from './accept-schedule.mjs';
import {createAcceptBridge} from './accept-bridge.mjs';
import {operateIncomingRequests} from './accept-dom.mjs';
import {createExtensionSchedule} from './schedule-bridge.mjs';
import {createContextReader} from './context-bridge.mjs';
import {createFeedWatch} from './feed-watch.mjs';

export const SITE = 'https://blog-neighbor-care.buylife.xyz';
export const AUTOPILOT_ALARM='bnc-autopilot';
export function createReaderController(browser, fetcher = fetch) {
  const ready = Promise.all([browser.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
    browser.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })]);
  const post = async (operation, payload, token, path='/api/reader/extension') => {
    const response = await fetcher(`${SITE}${path}`, { method: 'POST', cache: 'no-store', credentials: 'omit', redirect: 'error',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ operation, payload }), signal: AbortSignal.timeout(15000) });
    const json = await response.json();
    if (!response.ok) {const e=new Error(typeof json.error === 'string' ? json.error : '서버 응답을 확인하지 못했습니다. 결과 확인 버튼을 눌러 주세요.');e.status=response.status;e.code=json.code;throw e;}
    return json;
  };
  let importToken;
  const contexts=createContextReader(browser,async()=>{const {token}=await browser.storage.local.get('token');if(!token)throw Error('회원 연결이 필요합니다.');return (await post('whoami',{},token)).data;},
    async(operation,payload)=>{const {token}=await browser.storage.local.get('token');if(!token)throw Error('회원 연결이 필요합니다.');return (await post(operation,payload,token,'/api/neighbors/context/extension')).data;},windowId=>popupFocused(windowId));
  const work=createWorkBridge(browser,async()=>{
    const {token}=await browser.storage.local.get('token');if(!token)throw Error('회원 연결이 필요합니다.');
    return (await post('whoami',{},token)).data;
  },async(operation,payload)=>{const {token}=await browser.storage.local.get('token');if(!token)throw Error('회원 연결이 필요합니다.');return (await post(operation,payload,token,'/api/execution/extension')).data;},Date.now,windowId=>popupFocused(windowId));
  const schedule=createExtensionSchedule(browser,async()=>{const {token}=await browser.storage.local.get('token');if(!token)throw Error('회원 연결이 필요합니다.');return (await post('whoami',{},token)).data;},work,Date.now,windowId=>popupFocused(windowId));
  const acceptPost=async(operation,payload)=>{const {token}=await browser.storage.local.get('token');if(!token)throw Error('회원 연결이 필요합니다.');return (await post(operation,payload,token,'/api/neighbors/requests/extension')).data;};
  const acceptWho=async()=>{const {token}=await browser.storage.local.get('token');if(!token)throw Error('회원 연결이 필요합니다.');return (await post('whoami',{},token)).data;};
  const acceptReader=createContextReader(browser,acceptWho,(op,p)=>acceptPost(({offer:'offer_read',status:'status_read'})[op]??op,op==='offer'?{request_id:p.request_id,url:p.url}:p),windowId=>popupFocused(windowId),operateIncomingRequests);
  const acceptance=createAcceptBridge(browser,acceptWho,acceptPost,windowId=>popupFocused(windowId));
  const acceptSchedule=createAcceptSchedule(browser,acceptWho,acceptance,Date.now,windowId=>popupFocused(windowId));
  const traversal=createTargetTraversal(browser,acceptWho,work,async(op,p)=>{const {token}=await browser.storage.local.get('token');if(!token)throw Error('회원 연결이 필요합니다.');return (await post(op,p,token,'/api/execution/extension')).data;},Date.now,undefined,windowId=>popupFocused(windowId));
  const publishProgress=async progress=>{
    const {token}=await browser.storage.local.get('token');
    if(!token||token!==importToken||!progress.deviceId)return;
    try{await browser.storage.session.set({neighborProgress:progress});}catch{/* Progress is advisory, never a retry trigger. */}
    try{await browser.runtime.sendMessage?.({type:'neighbor_progress',progress});}catch{/* The popup can be closed. */}
  };
  const popupFocused=async windowId=>{
    if(!browser.runtime.sendMessage)return false;
    let timer;
    try{
      const result=await Promise.race([browser.runtime.sendMessage({type:'neighbor_focus_probe',windowId}),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),500);})]);
      return result?.focused===true&&result.windowId===windowId;
    }catch{return false;}finally{clearTimeout(timer);}
  };
  const neighbors=createNeighborImporter(browser,async(operation,payload)=>{
    const r=await post(operation,payload,importToken,'/api/neighbors/import/extension');return {...r.data,...(r.nonce?{nonce:r.nonce}:{})};
  },async()=>{
    const {token}=await browser.storage.local.get('token');if(!token||token!==importToken)throw Error('연결 계정이 변경됐습니다.');
    return (await post('whoami',{},token)).data;
  },undefined,undefined,publishProgress,popupFocused);
  // v1.18 C-2: 프로그램 「시작하기」에서 받은 통합 동의·일시정지 상태(서버 기록). 확장 팝업에서 다시 묻지 않는다.
  const autopilotStatus=async()=>{const {token}=await browser.storage.local.get('token');if(!token)throw Error('회원 연결이 필요합니다.');return (await post('autopilot_status',{},token,'/api/execution/extension')).data;};
  const seoul=(at=new Date())=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at).map(p=>[p.type,p.value]));return {day:`${parts.year}-${parts.month}-${parts.day}`,minute:Number(parts.hour)*60+Number(parts.minute)};};
  const inWindow=(minute,start,end)=>start===end||(start<end?minute>=start&&minute<end:minute>=start||minute<end);
  const feedWatch=createFeedWatch(browser,async(operation,payload)=>{const {token}=await browser.storage.local.get('token');if(!token)throw Object.assign(Error('회원 연결이 필요합니다.'),{status:401});return (await post(operation,payload,token,'/api/neighbors/monitor/extension')).data;},fetcher);
  const handle=async function(message, sender) {
    await ready;
    const popup = sender.id === browser.runtime.id && sender.url === browser.runtime.getURL('popup.html');
    let web = false;
    try { web = sender.id === browser.runtime.id && new URL(sender.tab?.url).origin === SITE; } catch { /* not the program tab */ }
    if (!message || typeof message !== 'object' || !(popup || (web && ['status', 'connect', 'feed_sync', 'version', 'traversal_start', 'traversal_status'].includes(message.type)))) throw new Error('프로그램 또는 확장 화면에서 실행해 주세요.');
    if(message.type==='version')return {version:browser.runtime.getManifest().version_name};
    const { token } = await browser.storage.local.get('token');
    // v1.17 C-1 (4): 실행 동의는 처음 한 번 — 같은 연결(토큰)·같은 범위면 다시 묻지 않는다. 연결이 바뀌거나 철회하면 사라진다.
    const consented=async scope=>{const {runConsent}=await browser.storage.local.get('runConsent');return !!token&&runConsent?.token===token&&Array.isArray(runConsent.scopes)&&runConsent.scopes.includes(scope);};
    const remember=async scope=>{const {runConsent}=await browser.storage.local.get('runConsent');const scopes=runConsent?.token===token&&Array.isArray(runConsent.scopes)?runConsent.scopes:[];await browser.storage.local.set({runConsent:{token,scopes:[...new Set([...scopes,scope])],at:new Date().toISOString()}});};
    if(message.type==='consent_status'){if(!popup)throw Error('확장 화면에서 실행해 주세요.');return {work:await consented('work'),traversal:await consented('traversal')};}
    if(message.type==='autopilot_status'){if(!popup)throw Error('확장 화면에서 실행해 주세요.');return autopilotStatus();}
    // 전체 일시정지(팝업): 서버 기록을 먼저 남기고, 이 기기의 순회·반복·실행을 모두 멈춘다. 다시 시작은 프로그램 화면에서.
    if(message.type==='autopilot_pause'){if(!popup||!token)throw Error('연결된 확장 화면에서 실행해 주세요.');
      let saved=true;try{await post('autopilot_pause',{},token,'/api/execution/extension');}catch{saved=false;}
      await traversal.stop();await schedule.stop();await acceptSchedule.stop();await acceptance.stop();await work.stop();
      return {paused:true,saved,message:saved?'전체 일시정지 · 다시 시작은 프로그램 「🏠 오늘의 소통」에서 누릅니다.':'이 기기의 실행은 멈췄습니다. 서버 기록은 확인하지 못했으니 프로그램에서도 일시정지를 눌러 주세요.'};}
    if(message.type==='consent_revoke'){if(!popup)throw Error('확장 화면에서 실행해 주세요.');await browser.storage.local.remove('runConsent');await traversal.stop();await schedule.stop();await work.stop();return {work:false,traversal:false};}
    if(['connect','disconnect'].includes(message.type)){await browser.storage.local.remove('runConsent');await browser.storage.local.remove('autopilotDay');}
    if(message.type==='feed_sync')return feedWatch.sync();
    if(['feed_status','feed_stop'].includes(message.type)){if(!popup)throw Error('확장 화면에서 실행해 주세요.');return message.type==='feed_status'?feedWatch.status():feedWatch.stop();}
    if(['connect','disconnect'].includes(message.type))await feedWatch.clear();
    if(['connect','disconnect','read','neighbors_read','work_start','work_stop','schedule_start','context_preview','accept_preview','accept_start','accept_check'].includes(message.type)){await traversal.stop();await acceptReader.cancel();await acceptance.stop();}
    if(['connect','disconnect','read','neighbors_read','work_start','work_stop','schedule_start','context_preview','accept_preview','accept_start','accept_check','accept_stop','traversal_start'].includes(message.type))await acceptSchedule.stop();
    if(['accept_schedule_start','accept_schedule_stop','accept_schedule_status'].includes(message.type)){
      if(!popup||!token)throw Error('연결된 확장 화면에서 실행해 주세요.');
      if(message.type==='accept_schedule_status')return acceptSchedule.status();
      if(message.type==='accept_schedule_stop')return acceptSchedule.stop();
      if(message.confirmed!==true||neighbors.isRunning())throw Error('받은 신청 반복 수락 동의를 확인해 주세요.');
      await traversal.stop();await schedule.stop();await work.stop();await contexts.cancel();await acceptReader.cancel();return acceptSchedule.start(true);
    }
    if(['traversal_start','traversal_stop','traversal_status'].includes(message.type)){if(!token||(!popup&&!web))throw Error('연결된 확장 화면에서 실행해 주세요.');if(message.type==='traversal_status')return traversal.status();if(message.type==='traversal_stop'){if(!popup)throw Error('확장 화면에서 실행해 주세요.');return traversal.stop();}
      // 웹 「승인한 작업 실행」은 확장 팝업에서 한 번 기억한 순회 동의가 있을 때만 시작한다(웹에서 새 동의를 만들지 않음).
      // v1.18 C-2: 프로그램 「시작하기」 통합 동의(서버 기록)가 있으면 확장 팝업 동의 없이 시작한다. 일시정지 중이면 시작하지 않는다.
      let server=null;if(!(popup&&message.confirmed===true)){try{server=await autopilotStatus();}catch{server=null;}}
      if(server?.paused)throw Error('전체 일시정지 중입니다. 프로그램에서 「다시 시작」을 누른 뒤 실행해 주세요.');
      const ok=popup&&message.confirmed===true||server?.consented===true||await consented('traversal');if(!ok||neighbors.isRunning())throw Error(web?'프로그램 「🏠 오늘의 소통」의 「시작하기」에서 처음 한 번 동의해 주세요.':'대상 글 순회 동의를 확인하세요.');
      if(popup&&message.confirmed===true||server?.consented===true)await remember('traversal');
      await schedule.stop();await work.stop();await contexts.cancel();await acceptReader.cancel();await acceptance.stop();return traversal.start(true);}
    if(['accept_preview','accept_confirm','accept_cancel','accept_start','accept_stop','accept_status','accept_check'].includes(message.type)){
      if(!popup||!token)throw Error('연결된 확장 화면에서 실행해 주세요.');
      if(message.type==='accept_status')return acceptance.status();
      if(message.type==='accept_stop')return acceptance.stop(true);
      if(message.type==='accept_cancel')return acceptReader.cancel(true);
      if(message.type==='accept_confirm')return acceptReader.confirm();
      if(message.confirmed!==true||neighbors.isRunning())throw Error('신청 읽기·수락 동의와 현재 작업을 확인해 주세요.');
      await schedule.stop();await work.stop();await contexts.cancel();
      if(message.type==='accept_preview'){await acceptance.stop();return acceptReader.preview('requests');}
      await acceptReader.cancel();if(message.type==='accept_check')return acceptance.check();return acceptance.start();
    }
    if(['schedule_start','schedule_stop','schedule_status'].includes(message.type)){
      if(!popup||!token)throw Error('연결된 확장 화면에서 실행해 주세요.');
      if(message.type==='schedule_status')return schedule.status();
      if(message.type==='schedule_stop')return schedule.stop();
      if(neighbors.isRunning()||message.confirmed!==true)throw Error('반복 동의와 현재 작업 상태를 확인해 주세요.');
      await contexts.cancel();return schedule.start(true);
    }
    if(['context_preview','context_confirm','context_cancel'].includes(message.type)){
      if(!popup||!token)throw Error('연결된 확장 화면에서 실행해 주세요.');
      if(message.type==='context_cancel')return contexts.cancel(true);
      if(message.type==='context_confirm')return contexts.confirm();
      if(message.confirmed!==true||neighbors.isRunning())throw Error('현재 화면 읽기 동의를 확인해 주세요.');
      await schedule.stop();await work.stop();return contexts.preview(message.kind);
    }
    if(['work_start','work_stop','work_status'].includes(message.type)){
      if(!popup)throw Error('확장 화면에서 실행해 주세요.');
      if(message.type==='work_stop'){await schedule.stop();return await work.stop();}
      if(message.type==='work_status')return await work.status();
      if(!token||!(message.confirmed===true||await consented('work'))||neighbors.isRunning())throw Error('회원 연결·현재 탭 실행 동의를 확인해 주세요.');
      if(message.confirmed===true)await remember('work');
      await schedule.stop();await contexts.cancel();
      return work.start();
    }
    if(typeof message.type==='string'&&message.type.startsWith('neighbors_')){
      if(!popup||!token)throw Error('연결된 확장 화면에서 실행해 주세요.');
      if(message.type==='neighbors_read')importToken=token;
      if(message.type==='neighbors_read'){await schedule.stop();await work.stop();}
      if(message.type==='neighbors_read')await contexts.cancel();
      if(!importToken)importToken=token;
      return neighbors(message);
    }
    if (message.type === 'connect') {
      await schedule.stop();
      await contexts.cancel();
      await work.stop();
      if (typeof message.code !== 'string' || !/^[a-f0-9]{32}$/.test(message.code)) throw new Error('프로그램에서 발급한 연결 번호를 확인해 주세요.');
      const result = await post('connect', { code: message.code, device_name: '내 브라우저 · 본인 글 읽기', protocol: 1 });
      if (!/^[a-f0-9]{64}$/.test(result.token) || !result.data?.deviceId || !result.data?.blogId) throw new Error('연결 결과를 확인하지 못했습니다. 새 번호로 연결해 주세요.');
      await browser.storage.local.set({ token: result.token });
      await browser.storage.session.remove('pending');
      await browser.storage.session.remove('neighborImport');
      await browser.storage.session.remove('neighborProgress');
      return { connected: true, blogId: result.data.blogId, expiresAt: result.data.expiresAt };
    }
    if (message.type === 'status') {
      if (!token) return { connected: false };
      const result = await post('whoami', {}, token);
      const { pending } = await browser.storage.session.get('pending');
      const {neighborProgress}=await browser.storage.session.get('neighborProgress');
      let progress=neighborProgress?.deviceId===result.data.deviceId?neighborProgress:null;
      const {neighborImport}=await browser.storage.session.get('neighborImport');
      if(popup&&progress&&neighborImport?.deviceId===result.data.deviceId&&!neighbors.isRunning()){
        importToken=token;
        try{
          await neighbors({type:'neighbors_status'});
          progress=(await browser.storage.session.get('neighborProgress')).neighborProgress;
        }catch{
          progress={...progress,stage:'paused',state:'stopped',message:'이전 목록의 최신 상태를 확인하지 못했습니다. 가져온 범위·이전 결과 확인을 눌러 주세요.'};
        }
      }
      const restored=progress?.state==='running'&&!neighbors.isRunning()?{...progress,stage:'paused',state:'stopped',message:'진행 중이던 읽기의 결과 확인이 필요합니다. 가져온 범위·이전 결과 확인을 눌러 주세요.'}:progress;
      let pageKind;
      if(popup){try{const [tab]=await browser.tabs.query({active:true,currentWindow:true});if(parseNeighborPage(tab?.url)?.blogId===result.data.blogId)pageKind='neighbors';}catch{/* Keep the general layout if the active page cannot be identified. */}}
      return { connected: true, ...result.data, pending: Boolean(pending), latestVersion: result.latestVersion,...(restored?{neighborProgress:restored}:{}),...(pageKind?{pageKind}:{}) };
    }
    if (!token) throw new Error('먼저 프로그램에서 이 회원 계정과 연결해 주세요.');
    if (message.type === 'disconnect') {
      await schedule.stop();
      await contexts.cancel();
      await work.stop();
      let remoteRevoked = false;
      try { await post('disconnect', {}, token); remoteRevoked = true; } catch { /* local removal still succeeds */ }
      await browser.storage.local.remove('token'); await browser.storage.session.remove('pending');
      await browser.storage.session.remove('neighborImport');
      await browser.storage.session.remove('neighborProgress');
      return { connected: false, remoteRevoked };
    }
    if(message.type==='read'){await schedule.stop();await work.stop();await contexts.cancel();}
    const identity = await post('whoami', {}, token);
    const { pending } = await browser.storage.session.get('pending');
    if (message.type === 'receipt') {
      if (!pending || pending.deviceId !== identity.data.deviceId) throw new Error('이 기기의 확인할 읽기 요청이 없습니다.');
      return (await post('status', { request_id: pending.id }, token)).data;
    }
    if (message.type === 'read') {
      if (message.ownerConfirmed !== true) throw new Error('본인 블로그와 자료 이용 범위를 먼저 확인해 주세요.');
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const target = parsePost(tab?.url);
      if (!target || !Number.isInteger(tab.id)) throw new Error('네이버에서 본인 글 1개를 열어 주세요. 목록·편집기 화면에서는 읽지 않습니다.');
      if (target.blogId !== identity.data.blogId) throw new Error('연결한 본인 블로그의 글을 열어 주세요.');
      const requestId = pending?.deviceId === identity.data.deviceId && pending.url === target.url ? pending.id : crypto.randomUUID();
      const ticket = await post('prepare', { request_id: requestId, url: target.url }, token);
      await browser.storage.session.set({ pending: { id: requestId, url: target.url, deviceId: identity.data.deviceId } });
      if (ticket.data.state === 'completed') return { receipt: ticket.data };
      const results = await browser.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: inspectVisiblePost, args: [identity.data.blogId] });
      const snapshot = chooseSnapshot(results, target.url);
      // Navigation during extraction must not mix another tab/page into this request.
      const current = await browser.tabs.get(tab.id);
      if (parsePost(current.url)?.url !== target.url) throw new Error('읽는 동안 글 주소가 바뀌었습니다. 결과를 보내지 않습니다.');
      return { requestId, snapshot };
    }
    if (message.type === 'submit') {
      if (!pending || pending.deviceId !== identity.data.deviceId || pending.id !== message.requestId || message.snapshot?.url !== pending.url) throw new Error('현재 기기의 읽기 내용을 다시 확인해 주세요.');
      const result = await post('submit', { request_id: pending.id, snapshot: message.snapshot }, token);
      return result.data;
    }
    throw new Error('지원하지 않는 작업입니다.');
  };
  // v1.18 C-2 자동 시작: 자동 모드·통합 동의가 있고 일시정지가 아니면, 동작 시간대가 되었을 때 하루 한 번 순회를 스스로 켠다.
  // 시작하지 못하거나 오류로 멈추면 그날은 다시 켜지 않는다(같은 탭을 반복해서 열지 않음). 다음 날 다시 시도.
  const autopilotTick=async()=>{
    const {token}=await browser.storage.local.get('token');if(!token||neighbors.isRunning())return {started:false,reason:'not_ready'};
    const today=seoul(new Date(Date.now()));const {autopilotDay}=await browser.storage.local.get('autopilotDay');if(autopilotDay===today.day)return {started:false,reason:'done_today'};
    const s=await autopilotStatus();
    if(!s?.consented||s.paused||s.mode!=='auto'||!s.enabled)return {started:false,reason:'off'};
    const w=s.schedule??{};if(!inWindow(today.minute,Number(w.startMinute),Number(w.endMinute)))return {started:false,reason:'outside_window'};
    const t=await traversal.status();if(t.enabled||t.resultCheckRequired){await browser.storage.local.set({autopilotDay:today.day});return {started:false,reason:'running'};}
    await browser.storage.local.set({autopilotDay:today.day});
    try{await remember('traversal');await traversal.start(true);return {started:true};}
    catch(e){await browser.storage.local.set({autopilotNote:{day:today.day,message:e?.message??'시작하지 못했습니다.'}});return {started:false,reason:'start_failed'};}
  };
  const remember=async scope=>{const {token}=await browser.storage.local.get('token');const {runConsent}=await browser.storage.local.get('runConsent');const scopes=runConsent?.token===token&&Array.isArray(runConsent.scopes)?runConsent.scopes:[];await browser.storage.local.set({runConsent:{token,scopes:[...new Set([...scopes,scope])],at:new Date().toISOString()}});};
  handle.onAlarm=async alarm=>{if(alarm.name===AUTOPILOT_ALARM){await ready;await autopilotTick().catch(()=>{});return;}await feedWatch.alarm(alarm.name);await schedule.alarm(alarm.name);await traversal.alarm(alarm.name);await acceptSchedule.alarm(alarm.name);};handle.resumeFeed=()=>feedWatch.resume();handle.autopilotTick=autopilotTick;
  handle.ensureAutopilot=async()=>{if(!browser.alarms?.get)return;if(!await browser.alarms.get(AUTOPILOT_ALARM))await browser.alarms.create(AUTOPILOT_ALARM,{delayInMinutes:1,periodInMinutes:10});};
  return handle;
}

if (globalThis.chrome?.runtime?.onMessage) {
  const handle = createReaderController(chrome);
  chrome.alarms?.onAlarm?.addListener(alarm=>{void handle.onAlarm(alarm).catch(()=>{});});
  // Alarms can be gone after a browser restart or extension reload; the saved session puts them back.
  chrome.runtime.onStartup?.addListener(()=>{void handle.resumeFeed().catch(()=>{});void handle.ensureAutopilot().catch(()=>{});});
  chrome.runtime.onInstalled?.addListener(()=>{void handle.resumeFeed().catch(()=>{});void handle.ensureAutopilot().catch(()=>{});});
  void handle.ensureAutopilot().catch(()=>{});
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(['neighbor_progress','neighbor_focus_probe','work_progress','schedule_progress','traversal_progress','accept_schedule_progress'].includes(message?.type))return false;
    handle(message, sender).then(data => sendResponse({ ok: true, data }), error => sendResponse({ ok: false,
      error: error?.message || '결과를 확인하지 못했습니다. 자동 재전송하지 않습니다.',
      // 2026-11-14: keep the diagnosis (no keys, nonces or page text) instead of dropping it here.
      status: Number.isInteger(error?.status) ? error.status : undefined,
      code: typeof error?.code === 'string' && /^BNC_[A-Z_]{1,60}$/.test(error.code) ? error.code : undefined,
      stage: typeof error?.stage === 'string' && /^[a-z_]{1,30}$/.test(error.stage) ? error.stage : undefined,
      at: new Date().toISOString() }));
    return true;
  });
}
