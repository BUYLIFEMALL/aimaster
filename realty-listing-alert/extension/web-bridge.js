// 부동산 매물 알림 웹 화면과 확장 사이의 좁은 다리(기준: naver-blog-seo-studio extension/web-bridge.js).
// 우리 사이트 화면만 쓸 수 있고, 연결 코드를 밖으로 내주지 않는다. 매물 데이터는 이 다리로 오가지 않는다.
//  - ping: 확장 설치 여부와 확장 버전만 알려준다.
//  - connect: 회원이 웹에서 「바로 연결」하면 새로 만든 연결 코드를 받아 확장에 저장만 한다.
(() => {
  if (location.origin !== "https://realty-listing-alert.vercel.app" && location.origin !== "https://realty-listing-alert.buylife.xyz") return;
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.source !== "realty-alert-app" || typeof message.requestId !== "string") return;
    if (message.type !== "ping" && message.type !== "connect") return;
    let result;
    if (message.type === "ping") {
      result = { ok: true, version: chrome.runtime.getManifest().version_name || "" };
    } else {
      try { result = await chrome.runtime.sendMessage({ type: "connect", token: String(message.token || ""), closeTab: message.closeTab === true }); }
      catch { result = { ok: false, error: "확장 프로그램을 새로고침하고 이 화면도 새로고침해 주세요." }; }
    }
    window.postMessage({ source: "realty-alert-extension", requestId: message.requestId, result }, location.origin);
  });
})();
