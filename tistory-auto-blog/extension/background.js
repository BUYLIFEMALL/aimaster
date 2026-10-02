chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const OFFSCREEN_PATH = "offscreen.html";

async function ensureClipboardDocument() {
  const url = chrome.runtime.getURL(OFFSCREEN_PATH);
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [url] });
  if (contexts.length) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["CLIPBOARD"],
    justification: "티스토리 편집기 탭이 활성화된 상태에서도 이미지 붙여넣기용 PNG 클립보드를 안전하게 준비합니다.",
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "copy-tistory-image") return;
  ensureClipboardDocument()
    .then(() => chrome.runtime.sendMessage({ type: "offscreen-copy-tistory-image", url: message.url }))
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  return true;
});
