// 웹 화면과 확장 사이의 좁은 다리. 우리 사이트 화면만 쓸 수 있고 연결 코드를 밖으로 내주지 않는다. 매물은 이 다리로 오가지 않는다.
(() => {
  if (location.origin !== "https://commercial-land-trade-alert.buylife.xyz") return;
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const m = event.data;
    if (m?.source !== "clta-app" || typeof m.requestId !== "string") return;
    if (m.type !== "ping" && m.type !== "connect") return;
    let result;
    if (m.type === "ping") {
      const { extToken, connectedEmail } = await chrome.storage.local.get(["extToken", "connectedEmail"]).catch(() => ({}));
      result = { ok: true, version: chrome.runtime.getManifest().version_name || "", connected: !!extToken, email: connectedEmail || null };
    } else {
      try { result = await chrome.runtime.sendMessage({ type: "connect", token: String(m.token || "") }); }
      catch { result = { ok: false, error: "확장을 새로고침하고 이 화면도 새로고침해 주세요." }; }
    }
    window.postMessage({ source: "clta-extension", requestId: m.requestId, result }, location.origin);
  });
})();
