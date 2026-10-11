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

    if (event.data.type === "ALLINONE_READ_CATEGORIES" && typeof event.data.requestId === "string") {
      const requestId = event.data.requestId;
      const reply = (payload) => window.postMessage({ type: "ALLINONE_CATEGORIES_RESULT", requestId, ...payload }, "*");
      try {
        chrome.runtime.sendMessage({ action: "READ_NAVER_CATEGORIES" }, (response) => {
          if (chrome.runtime.lastError) return reply({ error: "확장 프로그램을 새로고침하고 이 화면도 새로고침해 주세요." });
          reply(response?.categories ? { categories: response.categories } : { error: response?.error || "카테고리를 읽지 못했습니다." });
        });
      } catch {
        reply({ error: "확장 프로그램을 새로고침하고 이 화면도 새로고침해 주세요." });
      }
    }

    if (event.data.type === "ALLINONE_PING_EXTENSION") {
      window.postMessage({ type: "ALLINONE_PONG_EXTENSION", version: chrome.runtime.getManifest().version_name || "" }, "*");
    }
  });
})();
