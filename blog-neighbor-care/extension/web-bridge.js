(() => {
  if (location.origin !== 'https://blog-neighbor-care.buylife.xyz' || window.top !== window) return;
  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const m = event.data;
    if (m?.source !== 'bnc-reader-app' || !['status', 'connect'].includes(m.type) || typeof m.requestId !== 'string' || m.requestId.length > 80) return;
    let result;
    try { result = await chrome.runtime.sendMessage({ type: m.type, ...(m.type === 'connect' ? { code: m.code } : {}) }); }
    catch { result = { ok: false, error: '확장과 프로그램 화면을 새로고침해 주세요.' }; }
    window.postMessage({ source: 'bnc-reader-extension', requestId: m.requestId, result }, location.origin);
  });
})();
