// 상품소싱 자동화 화면과 확장 사이의 좁은 다리(기준: realty-listing-alert/extension/web-bridge.js).
// 우리 사이트 화면만 쓸 수 있고, 연결 코드를 밖으로 내주지 않는다.
(() => {
  if (location.origin !== "https://trending-product-finder.buylife.xyz") return;
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.source !== "tpf-app" || typeof message.requestId !== "string") return;
    let result = null;
    if (message.type === "ping") {
      const { extToken } = await chrome.storage.local.get("extToken").catch(() => ({}));
      result = { ok: true, version: chrome.runtime.getManifest().version_name || "", connected: Boolean(extToken) };
    } else if (message.type === "connect") {
      if (/^pat_[0-9a-f]{64}$/.test(String(message.token || ""))) {
        await chrome.storage.local.set({ extToken: message.token });
        result = { ok: true };
      } else {
        result = { ok: false, error: "연결 코드 형식이 올바르지 않습니다." };
      }
    } else {
      return;
    }
    window.postMessage({ source: "tpf-extension", requestId: message.requestId, result }, location.origin);
  });
})();
