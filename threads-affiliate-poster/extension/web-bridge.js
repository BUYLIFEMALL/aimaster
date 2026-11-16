// Threads 쇼핑제휴 자동화 화면(threads-affiliate-poster.buylife.xyz)과만 대화한다 — 설치 확인(status)과 링크 하나 수집(collect).
// 구조는 AIMaster 다른 확장(esm-register 등)의 web-bridge와 같다. 회원 정보·토큰은 다루지 않는다.
(() => {
  if (location.origin !== 'https://threads-affiliate-poster.buylife.xyz') return;
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const m = event.data;
    if (m?.source !== 'tap-app' || !['status', 'collect'].includes(m.type) || typeof m.requestId !== 'string') return;
    let result;
    try {
      result = m.type === 'status'
        ? await chrome.runtime.sendMessage({ type: 'status' })
        : await chrome.runtime.sendMessage({ type: 'collect', url: String(m.url || '') });
    } catch {
      result = { ok: false, error: '확장을 새로고침(chrome://extensions)한 뒤 이 화면도 새로고침해 주세요.' };
    }
    window.postMessage({ source: 'tap-extension', requestId: m.requestId, result }, location.origin);
  });
})();
