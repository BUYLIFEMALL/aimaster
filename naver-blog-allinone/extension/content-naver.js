// content-naver.js - 네이버 블로그 스마트에디터 ONE 원클릭 자동 주입 스크립트
(function () {
  // 이미 위젯이 삽입되었는지 체크
  if (document.getElementById("aimaster-allinone-widget")) return;

  // 스마트에디터 ONE 페이지인지 확인 (postwrite URL 또는 se-container 요소)
  function isSmartEditorPage() {
    return (
      location.href.includes("postwrite") ||
      location.href.includes("GoBlogWrite") ||
      Boolean(document.querySelector(".se-main-container, .se-documentTitle, .se-viewer"))
    );
  }

  // 지연 대기 함수
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 네이버 에디터에 제목 주입
  function injectTitle(titleText) {
    const titleCandidates = [
      document.querySelector(".se-documentTitle .se-ff-nanumgothic"),
      document.querySelector(".se-documentTitle .se-title-text"),
      document.querySelector(".se-title-text"),
      document.querySelector(".se-documentTitle p"),
      document.querySelector(".se-documentTitle [contenteditable='true']"),
    ].filter(Boolean);

    const titleEl = titleCandidates[0];
    if (!titleEl) return false;

    titleEl.focus();
    // contentEditable 처리
    if (titleEl.isContentEditable) {
      titleEl.innerText = titleText;
      titleEl.dispatchEvent(new Event("input", { bubbles: true }));
      titleEl.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (titleEl.tagName === "INPUT" || titleEl.tagName === "TEXTAREA") {
      titleEl.value = titleText;
      titleEl.dispatchEvent(new Event("input", { bubbles: true }));
      titleEl.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    return false;
  }

  // 네이버 에디터에 본문 주입
  async function injectBody(contentHtml, plainText) {
    const mainContainer = document.querySelector(".se-main-container");
    if (!mainContainer) return false;

    // 첫 번째 편집 가능 문단 찾기
    const editableParagraph =
      mainContainer.querySelector(".se-text-paragraph[contenteditable='true']") ||
      mainContainer.querySelector("[contenteditable='true']") ||
      mainContainer;

    editableParagraph.focus();
    await sleep(100);

    // 1차 시도: Clipboard Paste 이벤트를 통한 인라인 스타일 HTML 서식 완벽 주입
    try {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/html", contentHtml);
      clipboardData.setData("text/plain", plainText || contentHtml);

      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardData,
      });

      const handled = !editableParagraph.dispatchEvent(pasteEvent);
      if (handled) return true;
    } catch (e) {
      console.warn("[AllInOne] Paste event failed, fallback to execCommand:", e);
    }

    // 2차 시도: document.execCommand('insertHTML')
    try {
      const success = document.execCommand("insertHTML", false, contentHtml);
      if (success) {
        editableParagraph.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
    } catch (e) {
      console.warn("[AllInOne] execCommand failed:", e);
    }

    // 3차 시도: innerHTML 직접 주입 후 이벤트 발생
    try {
      editableParagraph.innerHTML = contentHtml;
      editableParagraph.dispatchEvent(new Event("input", { bubbles: true }));
      editableParagraph.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (e) {
      console.error("[AllInOne] Direct innerHTML failed:", e);
      return false;
    }
  }

  // 플로팅 위젯 UI 생성
  function createFloatingWidget(draft) {
    if (document.getElementById("aimaster-allinone-widget")) return;

    const widget = document.createElement("div");
    widget.id = "aimaster-allinone-widget";
    widget.style.cssText = `
      position: fixed;
      top: 60px;
      right: 24px;
      z-index: 999999;
      width: 320px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 16px;
      color: #1e293b;
      transition: all 0.2s ease;
    `;

    const titlePreview = draft?.title || "작성된 원고가 없습니다";
    const hasDraft = Boolean(draft && draft.title);

    widget.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
          <span style="font-size: 12px; font-weight: 800; color: #0f172a;">올인원 마스터 PRO</span>
          <span style="font-size: 10px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 6px;">v1.04</span>
        </div>
        <button id="aio-close-widget" style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 16px; line-height: 1;">&times;</button>
      </div>

      <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px; margin-bottom: 12px;">
        <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 4px;">대기 중인 최신 원고</div>
        <div id="aio-draft-title" style="font-size: 12px; font-weight: 700; color: #1e293b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${titlePreview}
        </div>
      </div>

      <button id="aio-inject-btn" ${!hasDraft ? "disabled" : ""} style="
        width: 100%;
        padding: 10px 14px;
        background: ${hasDraft ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "#cbd5e1"};
        color: #ffffff;
        border: none;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: ${hasDraft ? "pointer" : "not-allowed"};
        box-shadow: ${hasDraft ? "0 4px 6px -1px rgba(16, 185, 129, 0.2)" : "none"};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: opacity 0.2s;
      ">
        <span>⚡ 1초 원고 자동 주입</span>
      </button>

      <div id="aio-inject-status" style="display: none; font-size: 11px; margin-top: 8px; text-align: center; font-weight: 600;"></div>
    `;

    document.body.appendChild(widget);

    // 이벤트 리스너 연결
    document.getElementById("aio-close-widget")?.addEventListener("click", () => {
      widget.remove();
    });

    const injectBtn = document.getElementById("aio-inject-btn");
    const statusEl = document.getElementById("aio-inject-status");

    injectBtn?.addEventListener("click", async () => {
      if (!draft) return;

      injectBtn.textContent = "주입 진행 중...";
      injectBtn.style.opacity = "0.7";

      try {
        // 1. 제목 주입
        const titleOk = injectTitle(draft.title);

        await sleep(300);

        // 2. 본문 주입
        const bodyOk = await injectBody(draft.contentHtml, draft.plainText);

        if (titleOk || bodyOk) {
          statusEl.style.display = "block";
          statusEl.style.color = "#059669";
          statusEl.textContent = "🎉 원고가 성공적으로 입력되었습니다!";
          injectBtn.textContent = "✓ 주입 완료";
          injectBtn.style.background = "#059669";

          setTimeout(() => {
            widget.style.opacity = "0.4";
          }, 3000);
        } else {
          statusEl.style.display = "block";
          statusEl.style.color = "#e11d48";
          statusEl.textContent = "에디터 본문 영역을 한 번 클릭한 뒤 다시 눌러주세요.";
          injectBtn.textContent = "다시 시도";
          injectBtn.style.opacity = "1";
        }
      } catch (err) {
        console.error(err);
        statusEl.style.display = "block";
        statusEl.style.color = "#e11d48";
        statusEl.textContent = "주입 중 오류가 발생했습니다.";
        injectBtn.textContent = "다시 시도";
        injectBtn.style.opacity = "1";
      }
    });
  }

  // 초기 로드 시 스토리지 확인 및 위젯 주입
  function init() {
    if (!isSmartEditorPage()) return;

    chrome.storage.local.get(["currentDraft"], (res) => {
      createFloatingWidget(res?.currentDraft || null);
    });

    // 스토리지 변경 감지
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.currentDraft) {
        const oldWidget = document.getElementById("aimaster-allinone-widget");
        if (oldWidget) oldWidget.remove();
        createFloatingWidget(changes.currentDraft.newValue);
      }
    });
  }

  // 1초 후 DOM 안정화 시점 실행
  setTimeout(init, 1200);
})();
