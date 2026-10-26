// 프로그램 화면(smartstore-register.buylife.xyz)과만 대화한다 — 설치 확인(ping)과 웹 「확장 연결하기」(connect)뿐.
// 토큰은 웹에 넘기지 않는다.
(() => {
  if (location.origin !== 'https://smartstore-register.buylife.xyz') return;
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const m = event.data;
    if (m?.source !== 'ssr-app' || !['ping', 'connect'].includes(m.type) || typeof m.requestId !== 'string') return;
    let result;
    try {
      result = m.type === 'ping'
        ? await chrome.runtime.sendMessage({ type: 'status' })
        : await chrome.runtime.sendMessage({ type: 'pair', code: String(m.code || '') });
    } catch {
      result = { ok: false, error: '확장을 새로고침하고 이 화면도 새로고침해 주세요.' };
    }
    window.postMessage({ source: 'ssr-extension', requestId: m.requestId, result }, location.origin);
  });
})();
