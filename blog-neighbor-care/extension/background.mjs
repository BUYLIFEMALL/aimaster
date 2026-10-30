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

export const SITE = 'https://blog-neighbor-care.buylife.xyz';
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
  const handle=async function(message, sender) {
    await ready;
    const popup = sender.id === browser.runtime.id && sender.url === browser.runtime.getURL('popup.html');
    let web = false;
    try { web = sender.id === browser.runtime.id && new URL(sender.tab?.url).origin === SITE; } catch { /* not the program tab */ }
    if (!message || typeof message !== 'object' || !(popup || (web && ['status', 'connect'].includes(message.type)))) throw new Error('프로그램 또는 확장 화면에서 실행해 주세요.');
    const { token } = await browser.storage.local.get('token');
    if(['connect','disconnect','read','neighbors_read','work_start','work_stop','schedule_start','context_preview','accept_preview','accept_start','accept_check'].includes(message.type)){await traversal.stop();await acceptReader.cancel();await acceptance.stop();}
    if(['connect','disconnect','read','neighbors_read','work_start','work_stop','schedule_start','context_preview','accept_preview','accept_start','accept_check','accept_stop','traversal_start'].includes(message.type))await acceptSchedule.stop();
    if(['accept_schedule_start','accept_schedule_stop','accept_schedule_status'].includes(message.type)){
      if(!popup||!token)throw Error('연결된 확장 화면에서 실행해 주세요.');
      if(message.type==='accept_schedule_status')return acceptSchedule.status();
      if(message.type==='accept_schedule_stop')return acceptSchedule.stop();
      if(message.confirmed!==true||neighbors.isRunning())throw Error('받은 신청 반복 수락 동의를 확인해 주세요.');
      await traversal.stop();await schedule.stop();await work.stop();await contexts.cancel();await acceptReader.cancel();return acceptSchedule.start(true);
    }
    if(['traversal_start','traversal_stop','traversal_status'].includes(message.type)){if(!popup||!token)throw Error('연결된 확장 화면에서 실행해 주세요.');if(message.type==='traversal_status')return traversal.status();if(message.type==='traversal_stop')return traversal.stop();if(message.confirmed!==true||neighbors.isRunning())throw Error('대상 글 순회 동의를 확인하세요.');await schedule.stop();await work.stop();await contexts.cancel();await acceptReader.cancel();await acceptance.stop();return traversal.start(true);}
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
      if(!token||message.confirmed!==true||neighbors.isRunning())throw Error('회원 연결·현재 탭 실행 동의를 확인해 주세요.');
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
  handle.onAlarm=async alarm=>{await schedule.alarm(alarm.name);await traversal.alarm(alarm.name);await acceptSchedule.alarm(alarm.name);};return handle;
}

if (globalThis.chrome?.runtime?.onMessage) {
  const handle = createReaderController(chrome);
  chrome.alarms?.onAlarm?.addListener(alarm=>{void handle.onAlarm(alarm).catch(()=>{});});
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(['neighbor_progress','neighbor_focus_probe','work_progress','schedule_progress','traversal_progress','accept_schedule_progress'].includes(message?.type))return false;
    handle(message, sender).then(data => sendResponse({ ok: true, data }), error => sendResponse({ ok: false,
      error: error?.message || '결과를 확인하지 못했습니다. 자동 재전송하지 않습니다.' }));
    return true;
  });
}
