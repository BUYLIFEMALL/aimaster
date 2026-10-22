// AI 블로그 콘텐츠 제작 웹 화면과 확장 사이의 좁은 다리(2026-10-23, 기준 구현: naver-blog-seo-studio).
// 이 사이트 화면만 쓸 수 있고, 확장이 가진 연결 코드를 내주거나 입력·발행 명령을 전달하지 않는다.
//  - ping: 확장이 설치돼 있는지와 확장 버전만 알려준다.
//  - connect: 회원이 웹에서 「바로 연결」하면 웹이 방금 만든 연결 코드를 받아 확장에 저장만 한다.
(() => {
  if (location.origin !== "https://blog-content-maker.buylife.xyz") return;
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.source !== "bcm-app" || typeof message.requestId !== "string") return;
    if (message.type !== "ping" && message.type !== "connect") return;
    let result;
    if (message.type === "ping") {
      result = { ok: true, version: chrome.runtime.getManifest().version_name || "" };
    } else {
      try { result = await chrome.runtime.sendMessage({ action: "connectFromWeb", token: String(message.token || ""), closeTab: message.closeTab === true }); }
      catch { result = { ok: false, error: "확장 프로그램을 새로고침하고 이 화면도 새로고침해 주세요." }; }
    }
    window.postMessage({ source: "bcm-extension", requestId: message.requestId, result }, location.origin);
  });
})();
