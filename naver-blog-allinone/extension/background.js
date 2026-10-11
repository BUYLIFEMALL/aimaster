// background.js - 네이버 블로그 올인원 마스터 PRO
chrome.runtime.onInstalled.addListener(() => {
  console.log("[AIMaster 올인원 마스터] 확장 프로그램이 설치되었습니다.");
});

// 메시지 리스너 (원고 동기화 및 탭 열기)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "SAVE_DRAFT") {
    chrome.storage.local.set({ currentDraft: message.draft }, () => {
      sendResponse({ status: "SUCCESS" });
    });
    return true;
  }

  if (message.action === "GET_DRAFT") {
    chrome.storage.local.get(["currentDraft"], (result) => {
      sendResponse({ draft: result.currentDraft || null });
    });
    return true;
  }

  if (message.action === "OPEN_NAVER_EDITOR") {
    chrome.tabs.create({ url: "https://blog.naver.com/GoBlogWrite.naver" });
    sendResponse({ status: "SUCCESS" });
    return true;
  }
});
