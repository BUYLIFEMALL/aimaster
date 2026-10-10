// 티스토리 입력기 사이트 화면과 확장 프로그램 사이의 좁은 다리(v1.59).
// 이 사이트(첫 번째 출처)의 화면만 쓸 수 있고, 연동 토큰을 내주거나 입력·발행 명령을 전달하지 않는다.
//  - ping: 확장이 설치돼 있는지와 확장 버전만 알려준다.
//  - categories: 회원의 티스토리 카테고리 이름 목록을 읽어 돌려준다(background.js가 새 탭에서 카테고리 목록만 읽고 닫는다).
//  - topics: 발행 설정창에서 확인해 둔 실제 홈주제 목록(저장된 값만, 브라우저 작업 없음).
(() => {
  if (location.origin !== "https://tistory-auto-blog-pearl.vercel.app") return;
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.source !== "tistory-publishing-app" || typeof message.requestId !== "string") return;
    if (message.type !== "ping" && message.type !== "categories" && message.type !== "topics") return;
    let result;
    if (message.type === "ping") {
      result = { ok: true, version: chrome.runtime.getManifest().version_name || "" };
    } else if (message.type === "topics") {
      try { result = await chrome.runtime.sendMessage({ type: "topics" }); }
      catch { result = { topics: [] }; }
    } else {
      try { result = await chrome.runtime.sendMessage({ type: "categories" }); }
      catch { result = { error: "확장 프로그램을 새로고침하고 이 화면도 새로고침해 주세요." }; }
    }
    window.postMessage({ source: "tistory-publishing-extension", requestId: message.requestId, result }, location.origin);
  });
})();
