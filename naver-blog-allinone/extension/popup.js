// popup.js - 확장 프로그램 팝업 로직
document.addEventListener("DOMContentLoaded", () => {
  const titleEl = document.getElementById("draft-title");
  const timeEl = document.getElementById("draft-time");
  const openNaverBtn = document.getElementById("open-naver-btn");
  const openWebBtn = document.getElementById("open-web-btn");

  // 스토리지에서 보관된 원고 조회
  chrome.storage.local.get(["currentDraft", "lastUpdated"], (res) => {
    const draft = res.currentDraft;
    if (draft && draft.title) {
      titleEl.textContent = draft.title;
      if (res.lastUpdated) {
        const d = new Date(res.lastUpdated);
        timeEl.textContent = `${d.getHours()}시 ${d.getMinutes()}분 저장됨`;
      } else {
        timeEl.textContent = "최신 생성본";
      }
      openNaverBtn.disabled = false;
    } else {
      titleEl.textContent = "작성된 원고가 없습니다. 웹에서 먼저 원고를 생성해주세요.";
      titleEl.style.color = "#94a3b8";
      timeEl.textContent = "-";
      openNaverBtn.disabled = true;
      openNaverBtn.style.opacity = "0.5";
      openNaverBtn.style.cursor = "not-allowed";
    }
  });

  // 네이버 글쓰기 창 열기
  openNaverBtn?.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://blog.naver.com/GoBlogWrite.naver" });
    window.close();
  });

  // 웹 페이지 열기
  openWebBtn?.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://naver-blog-allinone.buylife.xyz" });
    window.close();
  });
});
