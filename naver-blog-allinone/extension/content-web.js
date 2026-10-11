// content-web.js - 웹 앱과 크롬 확장 프로그램 간 양방향 브릿지
(function () {
  // 웹 앱에 확장 설치 완료 신호 주입
  const injectScript = () => {
    try {
      const script = document.createElement("script");
      script.textContent = "window.__ALLINONE_EXTENSION_INSTALLED__ = true;";
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (e) {
      // ignore
    }
  };
  injectScript();

  // 웹 페이지로부터의 원고 동기화 메시지 청취
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === "ALLINONE_SYNC_DRAFT") {
      const draft = event.data.draft;
      if (draft) {
        chrome.storage.local.set({ currentDraft: draft, lastUpdated: Date.now() }, () => {
          window.postMessage(
            {
              type: "ALLINONE_SYNC_ACK",
              success: true,
              timestamp: Date.now(),
            },
            "*"
          );
        });
      }
    }

    if (event.data.type === "ALLINONE_PING_EXTENSION") {
      window.postMessage({ type: "ALLINONE_PONG_EXTENSION", version: "v1.04" }, "*");
    }
  });
})();
