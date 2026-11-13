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
    } else if (message.type === "collect-photos") {
      // 원본 사진 참고 수집(2026-11-13): 뒤편이 회원 브라우저로 사진을 받아 돌려준다. 필요한 값만 넘긴다.
      result = await chrome.runtime
        .sendMessage({ type: "collect-photos", market: message.market, id: message.id, productUrl: message.productUrl, imageUrls: message.imageUrls, consent: message.consent === true })
        .catch(() => ({ ok: false, error: "확장과 연결하지 못했습니다. 확장을 새로 고친 뒤 다시 눌러 주세요." }));
    } else {
      return;
    }
    window.postMessage({ source: "tpf-extension", requestId: message.requestId, result }, location.origin);
  });
})();
