// 웹 화면과 확장 사이의 좁은 다리. 우리 사이트 화면만 쓸 수 있고 연결 코드를 밖으로 내주지 않는다. 매물은 같은 계정의 결과 화면에만 건네고 서버로 보내지 않는다.
(() => {
  if (location.origin !== "https://commercial-land-trade-alert.buylife.xyz") return;
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const m = event.data;
    if (m?.source !== "clta-app" || typeof m.requestId !== "string") return;
    if (m.type !== "ping" && m.type !== "connect" && m.type !== "lastResult") return;
    let result;
    if (m.type === "ping") {
      const { extToken, connectedEmail } = await chrome.storage.local.get(["extToken", "connectedEmail"]).catch(() => ({}));
      result = { ok: true, version: chrome.runtime.getManifest().version_name || "", connected: !!extToken, email: connectedEmail || null };
    } else if (m.type === "lastResult") {
      // 확장 연결 계정과 지금 로그인 계정이 같을 때만, 같은 화면에만 돌려준다. 서버로 가지 않는다.
      const { connectedEmail, lastResult } = await chrome.storage.local.get(["connectedEmail", "lastResult"]).catch(() => ({}));
      const same = connectedEmail && String(m.email || "").toLowerCase() === String(connectedEmail).toLowerCase();
      result = same ? { ok: true, lastResult: lastResult || null } : { ok: false };
    } else {
      try { result = await chrome.runtime.sendMessage({ type: "connect", token: String(m.token || "") }); }
      catch { result = { ok: false, error: "확장을 새로고침하고 이 화면도 새로고침해 주세요." }; }
    }
    window.postMessage({ source: "clta-extension", requestId: m.requestId, result }, location.origin);
  });
})();
