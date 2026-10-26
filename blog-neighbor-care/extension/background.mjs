import { parsePost, inspectVisiblePost, chooseSnapshot } from './extractor.mjs';

export const SITE = 'https://blog-neighbor-care.buylife.xyz';
export function createReaderController(browser, fetcher = fetch) {
  const ready = Promise.all([browser.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
    browser.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })]);
  const post = async (operation, payload, token) => {
    const response = await fetcher(`${SITE}/api/reader/extension`, { method: 'POST', cache: 'no-store', credentials: 'omit', redirect: 'error',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ operation, payload }), signal: AbortSignal.timeout(15000) });
    const json = await response.json();
    if (!response.ok) throw new Error(typeof json.error === 'string' ? json.error : '서버 응답을 확인하지 못했습니다. 결과 확인 버튼을 눌러 주세요.');
    return json;
  };
  return async function handle(message, sender) {
    await ready;
    const popup = sender.id === browser.runtime.id && sender.url === browser.runtime.getURL('popup.html');
    let web = false;
    try { web = sender.id === browser.runtime.id && new URL(sender.tab?.url).origin === SITE; } catch { /* not the program tab */ }
    if (!message || typeof message !== 'object' || !(popup || (web && ['status', 'connect'].includes(message.type)))) throw new Error('프로그램 또는 확장 화면에서 실행해 주세요.');
    const { token } = await browser.storage.local.get('token');
    if (message.type === 'connect') {
      if (typeof message.code !== 'string' || !/^[a-f0-9]{32}$/.test(message.code)) throw new Error('프로그램에서 발급한 연결 번호를 확인해 주세요.');
      const result = await post('connect', { code: message.code, device_name: '내 브라우저 · 본인 글 읽기', protocol: 1 });
      if (!/^[a-f0-9]{64}$/.test(result.token) || !result.data?.deviceId || !result.data?.blogId) throw new Error('연결 결과를 확인하지 못했습니다. 새 번호로 연결해 주세요.');
      await browser.storage.local.set({ token: result.token });
      await browser.storage.session.remove('pending');
      return { connected: true, blogId: result.data.blogId, expiresAt: result.data.expiresAt };
    }
    if (message.type === 'status') {
      if (!token) return { connected: false };
      const result = await post('whoami', {}, token);
      const { pending } = await browser.storage.session.get('pending');
      return { connected: true, ...result.data, pending: Boolean(pending), latestVersion: result.latestVersion };
    }
    if (!token) throw new Error('먼저 프로그램에서 이 회원 계정과 연결해 주세요.');
    if (message.type === 'disconnect') {
      let remoteRevoked = false;
      try { await post('disconnect', {}, token); remoteRevoked = true; } catch { /* local removal still succeeds */ }
      await browser.storage.local.remove('token'); await browser.storage.session.remove('pending');
      return { connected: false, remoteRevoked };
    }
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
}

if (globalThis.chrome?.runtime?.onMessage) {
  const handle = createReaderController(chrome);
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handle(message, sender).then(data => sendResponse({ ok: true, data }), error => sendResponse({ ok: false,
      error: error?.message || '결과를 확인하지 못했습니다. 자동 재전송하지 않습니다.' }));
    return true;
  });
}
