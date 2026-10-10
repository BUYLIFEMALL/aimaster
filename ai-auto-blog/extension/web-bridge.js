// BLOG 사이트 화면과 확장 프로그램 사이의 좁은 다리(v1.57).
// 이 사이트(첫 번째 출처)의 화면만 쓸 수 있고, 연동 토큰을 내주거나 입력·발행 명령을 전달하지 않는다.
//  - ping: 확장이 설치돼 있는지와 확장 버전만 알려준다.
//  - categories: 회원의 실제 네이버 카테고리 목록(번호·이름)을 읽어 돌려준다(background.js가 새 탭에서 발행 설정창만 읽고 닫는다).
(() => {
  if (location.origin !== "https://ai-auto-blog-one.vercel.app") return;
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.source !== "blog-publishing-app" || typeof message.requestId !== "string") return;
    if (message.type !== "ping" && message.type !== "categories") return;
    let result;
    if (message.type === "ping") {
      result = { ok: true, version: chrome.runtime.getManifest().version_name || "" };
    } else {
      try { result = await chrome.runtime.sendMessage({ type: "categories" }); }
      catch { result = { error: "확장 프로그램을 새로고침하고 이 화면도 새로고침해 주세요." }; }
    }
    window.postMessage({ source: "blog-publishing-extension", requestId: message.requestId, result }, location.origin);
  });
})();
